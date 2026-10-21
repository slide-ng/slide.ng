// The `export` and `export-notes` commands: build the deck (or use `--dist` / `--url`), serve it, and run the exporter.
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
import { buildDeck } from './runtime.mjs';

export async function exportCommand(argv, { notes = false } = {}) {
  const { flags, positionals } = parseFlags(argv, EXPORT_FLAGS);
  applyThemeFlag(flags);
  applyLangFlag(flags);
  const entry = resolve(positionals[0] ?? 'slides.md');
  checkToolDir(dirname(entry)); // before anything is written or removed under .slide-ng
  const deck = await parseDeck(entry);
  const options = resolveExportOptions(flags, deck.headmatter);
  pagesToExport(deck, options.range); // a range that picks no slide fails now, not after the build
  let routerMode = addressMode(deck.headmatter);
  const base = flags.base ?? '/';

  const outBase = outputBase({
    output: flags.output,
    exportFilename: deck.headmatter.exportFilename,
    entry,
    dir: process.cwd(),
    suffix: notes ? '-notes' : '',
  });

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
      console.log('Building the deck for export...');
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
