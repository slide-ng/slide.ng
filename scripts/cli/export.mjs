// The `export` and `export-notes` commands: build the deck (or use `--dist` / `--url`), serve it, and run the exporter.
// Several entries are exported one after another, one file each (see entries.mjs).
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { exportNotes, exportSlides, pagesToExport } from '../export/index.mjs';
import { outputBase } from '../export/filename.mjs';
import { EXPORT_FLAGS, resolveExportOptions } from '../export/options.mjs';
import { serveDirectory } from '../export/static-server.mjs';
import { addressMode, builtRouterMode } from '../lib/build-options.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';
import { applyLangFlag, applyThemeFlag, parseFlags } from './flags.mjs';
import { checkToolDir, removeInside } from '../lib/tool-dir.mjs';
import { checkDistinctOutputs, checkExportFlags, deckEntries } from './entries.mjs';
import { buildDeck } from './runtime.mjs';
import { normalizeBase } from './build.mjs';

export async function exportCommand(argv, { notes = false } = {}) {
  const { flags, positionals } = parseFlags(argv, EXPORT_FLAGS);
  applyThemeFlag(flags);
  applyLangFlag(flags);
  const entries = deckEntries(positionals);
  checkExportFlags(entries, flags);
  // Every deck is read and checked before the first build, so a mistake in the last one does not wait for the others.
  const plans = [];
  for (const entry of entries) plans.push(await planExport(entry, flags, notes));
  checkDistinctOutputs(
    entries,
    plans.map((p) => p.outBase),
  );
  // One deck after another, so only one build and one browser run at a time.
  const written = [];
  for (const plan of plans) written.push(await exportOne(plan, flags, notes));
  return written.length === 1 ? written[0] : written;
}

async function planExport(entry, flags, notes) {
  checkToolDir(dirname(entry)); // before anything is written or removed under .slide-ng
  const deck = await parseDeck(entry);
  const options = resolveExportOptions(flags, deck.headmatter);
  pagesToExport(deck, options.range); // a range that picks no slide fails now, not after the build
  const outBase = outputBase({
    output: flags.output,
    exportFilename: deck.headmatter.exportFilename,
    entry,
    dir: process.cwd(),
    suffix: notes ? '-notes' : '',
  });
  return { entry, deck, options, outBase, base: exportBase(flags) };
}

/** The base a build was made with: the `<base href>` of its index.html, or null when it has no absolute one (an offline folder). */
export function builtBase(dist) {
  let html;
  try {
    html = readFileSync(join(dist, 'index.html'), 'utf8');
  } catch {
    return null;
  }
  const href = /<base href="([^"]*)"/.exec(html)?.[1];
  return href?.startsWith('/') ? href : null;
}

/** The base to serve the deck under: an existing build (`--dist`) keeps the one it was made with, which `--base` must match. */
export function exportBase(flags) {
  const recorded = flags.dist ? builtBase(resolve(flags.dist)) : null;
  if (!recorded) return flags.base ?? '/';
  if (flags.base != null && normalizeBase(flags.base) !== recorded)
    throw new Error(
      `--base ${flags.base} does not match the build at ${flags.dist}, which was made with the base ${recorded}; leave --base out or build again`,
    );
  return recorded;
}

async function exportOne({ entry, deck, options, outBase, base }, flags, notes) {
  let routerMode = addressMode(deck.headmatter);

  // Where the deck is served from: a running server, an existing build, or a build made now.
  let served,
    close = async () => {},
    workDir;
  if (flags.url) {
    const url = new URL(flags.url);
    served = {
      origin: url.origin,
      base: url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`,
    };
  } else {
    let dist = flags.dist && resolve(flags.dist);
    if (dist) {
      // A build records how it routes (it may have been made with --router-mode); an older one goes by the headmatter.
      const page = join(dist, 'index.html');
      const built = existsSync(page) && builtRouterMode(readFileSync(page, 'utf8'));
      if (built) routerMode = addressMode({ routerMode: built });
    } else {
      workDir = join(dirname(entry), '.slide-ng', 'export-build');
      console.log(`Building ${entry} for export...`);
      // Export opens pages by address, so a memory-routed deck is built with history routing for it (as Slidev's export mode).
      const env =
        deck.headmatter.routerMode === 'memory' ? { SLIDE_NG_ROUTER_MODE: 'history' } : {};
      dist = buildDeck({ entry, workDir, base, quiet: true, folder: 'app-export', env });
    }
    const server = await serveDirectory(dist, base);
    // The server goes away after the export, so the PDF must not link to it (export/page.mjs dropServerLinks).
    served = { origin: server.origin, base, temporary: true };
    close = server.close;
  }

  try {
    const run = notes ? exportNotes : (a) => exportSlides({ ...a, deck });
    const written = await run({ options, served, routerMode, outBase });
    console.log(`Exported to ${written}`);
    return written;
  } finally {
    await close();
    // Only the folder this command made itself is removed.
    if (workDir) removeInside(workDir, dirname(entry));
  }
}
