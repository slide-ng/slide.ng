// The `export` and `export-notes` commands: build the deck (or use `--dist` / `--url`), serve it, and run the exporter.
import { dirname, join, resolve } from 'node:path';
import { exportNotes, exportSlides } from '../export/index.mjs';
import { outputBase } from '../export/filename.mjs';
import { EXPORT_FLAGS, resolveExportOptions } from '../export/options.mjs';
import { serveDirectory } from '../export/static-server.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';
import { applyThemeFlag, parseFlags } from './flags.mjs';
import { checkToolDir, removeInside } from '../lib/tool-dir.mjs';
import { buildDeck } from './runtime.mjs';

export async function exportCommand(argv, { notes = false } = {}) {
  const { flags, positionals } = parseFlags(argv, EXPORT_FLAGS);
  applyThemeFlag(flags);
  const entry = resolve(positionals[0] ?? 'slides.md');
  checkToolDir(dirname(entry)); // before anything is written or removed under .slide-ng
  const deck = await parseDeck(entry);
  const options = resolveExportOptions(flags, deck.headmatter);
  const routerMode = deck.headmatter.routerMode === 'hash' ? 'hash' : 'history';
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
    if (!dist) {
      workDir = join(dirname(entry), '.slide-ng', 'export-build');
      console.log('Building the deck for export...');
      dist = buildDeck({ entry, workDir, base, quiet: true, folder: 'app-export' });
    }
    const server = await serveDirectory(dist, base);
    served = { origin: server.origin, base };
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
