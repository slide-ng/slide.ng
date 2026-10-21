// The `build` command: a static copy of the deck that any web server can host.
//   slide-ng build [slides.md..] [--base /talk/] [--out dist] [--download] [--without-notes]
// Several entries are built one after another into <out>/<name>/ (see entries.mjs).
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { makeOffline } from '../build/offline.mjs';
import { ogImagePlan, placeOgImage } from '../build/og-image.mjs';
import { applyOffline } from '../lib/build-options.mjs';
import { copyDefaultIcons, iconSource, writeIcons } from '../build/pwa-icons.mjs';
import { pwaEnabled, writePwa } from '../build/pwa.mjs';
import { launchBrowser } from '../export/browser.mjs';
import { exportSlides } from '../export/index.mjs';
import { downloadTarget } from '../export/filename.mjs';
import { resolveExportOptions } from '../export/options.mjs';
import { serveDirectory } from '../export/static-server.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';
import { applyThemeFlag, parseFlags } from './flags.mjs';
import { MARKER, checkClaimable, markDirectory, publishDirectory } from './safe-dir.mjs';
import { checkToolDir, removeInside } from '../lib/tool-dir.mjs';
import { buildTargets, checkEntriesExist, deckEntries } from './entries.mjs';
import { buildDeck } from './runtime.mjs';

export const BUILD_FLAGS = {
  base: { type: 'string' },
  out: { type: 'string', alias: 'o' },
  download: { type: 'boolean' },
  offline: { type: 'boolean' },
  'without-notes': { type: 'boolean' },
  'executable-path': { type: 'string' },
  'no-sandbox': { type: 'boolean' },
  'allow-local': { type: 'boolean' },
  timeout: { type: 'number' },
  theme: { type: 'string', alias: 't' },
};

/** `/talk`, `talk/` and `/talk/` all become `/talk/`. Only plain path pieces are allowed (it goes into the page). */
export function normalizeBase(base = '/') {
  const path = `/${base}/`.replace(/\/+/g, '/');
  if (!/^\/([\w.~-]+\/)*$/.test(path) || path.includes('/../') || path.includes('/./')) {
    throw new Error(`--base must be a path such as /talk/, got "${base}"`);
  }
  return path;
}

export async function buildCommand(argv) {
  const { flags, positionals } = parseFlags(argv, BUILD_FLAGS);
  applyThemeFlag(flags);
  const entries = deckEntries(positionals);
  const offline = Boolean(flags.offline);
  if (offline && flags.base)
    throw new Error('--offline builds a folder that works at any path, so it cannot take --base');
  const out = resolve(flags.out ?? 'dist');
  const targets = buildTargets(entries, {
    out,
    base: offline ? './' : normalizeBase(flags.base),
    offline,
  });
  checkEntriesExist(entries);
  for (const target of targets) checkToolDir(dirname(target.entry)); // before anything is written or removed under .slide-ng
  checkClaimable(out); // fail now, not after a long build
  // With several decks --out is claimed as a whole: marked now, so that a later build of one deck or several may empty it,
  // and once the decks are in, what an earlier build left there (a single deck's index.html and _redirects, another
  // deck's folder) is removed.
  const several = targets.length > 1;
  if (several) {
    mkdirSync(out, { recursive: true });
    markDirectory(out);
  }
  // One deck after another, so only one Angular build runs at a time.
  for (const target of targets) await buildOne({ ...target, flags, offline, several });
  if (several) keepOnly(out, [MARKER, ...targets.map((t) => basename(t.out))]);
}

// Removes everything in a folder of ours but the given names.
function keepOnly(dir, names) {
  for (const name of readdirSync(dir))
    if (!names.includes(name)) rmSync(join(dir, name), { recursive: true, force: true });
}

async function buildOne({ entry, out, base, flags, offline, several }) {
  const root = dirname(entry);
  const deck = await parseDeck(entry);
  const head = deck.headmatter;
  if (offline) applyOffline(head);

  const download = flags.download || downloadTarget(head, entry) !== null;
  const workDir = join(root, '.slide-ng', 'build');
  const env = {
    SLIDE_NG_BUILD: '1',
    SLIDE_NG_BASE: base,
    SLIDE_NG_DOWNLOAD: flags.download ? '1' : '0',
    SLIDE_NG_WITHOUT_NOTES: flags['without-notes'] ? '1' : '0',
    SLIDE_NG_OFFLINE: offline ? '1' : '0',
  };
  try {
    const dist = buildDeck({ entry, workDir, base, env });
    await afterBuild({ dist, deck, entry, root, base, workDir, download, flags, offline });
    // A deck's folder inside the claimed --out of several decks is ours, whatever an earlier build put there.
    if (several) rmSync(out, { recursive: true, force: true });
    publishDirectory(dist, out);
    console.log(
      `\nBuilt ${deck.slides.length} slides into ${out} (${offline ? `offline folder, open ${join(out, 'index.html')}` : `base ${base}`}).`,
    );
  } finally {
    removeInside(workDir, root); // the folder this command made itself
  }
}

// Files that can only be made once the app exists: the picture, the PDF, the 404 page, the offline worker.
async function afterBuild({ dist, deck, entry, root, base, workDir, download, flags, offline }) {
  const head = deck.headmatter;
  const routerMode = head.routerMode === 'hash' ? 'hash' : 'history';
  const exportOptions = {
    'executable-path': flags['executable-path'],
    timeout: flags.timeout,
    'no-sandbox': flags['no-sandbox'],
    'allow-local': flags['allow-local'],
  };
  const needsBrowser = ogImagePlan(head, root).kind === 'auto' || download;
  // The temporary server answers at its root; an offline folder has no base path (its addresses are relative).
  const serverBase = offline ? '/' : base;
  const server = needsBrowser ? await serveDirectory(dist, serverBase) : null;
  const served = server && { origin: server.origin, base: serverBase };

  try {
    // Open Graph picture: the first slide.
    await placeOgImage(ogImagePlan(head, root), {
      deckRoot: root,
      distDir: dist,
      workDir: join(workDir, 'og'),
      makePicture: async (dir) => {
        const options = resolveExportOptions(
          { ...exportOptions, format: 'png', range: '1', scale: 1.5 },
          {},
        );
        await exportSlides({
          deck,
          options,
          served,
          routerMode,
          outBase: join(dir, 'og'),
          log: () => {},
        });
        return join(dir, 'og', '001.png');
      },
    });
    // The PDF the "download" button points to.
    const target =
      downloadTarget(head, entry) ?? downloadTarget({ ...head, download: true }, entry);
    if (download && /^https?:|^\//.test(target))
      console.log(`download points to ${target}; no PDF is made`);
    else if (download) {
      const options = resolveExportOptions(exportOptions, head);
      const makePdf = () =>
        exportSlides({
          deck,
          options: { ...options, format: 'pdf' },
          served,
          routerMode,
          outBase: join(dist, target.replace(/\.pdf$/, '')),
        });
      // `--download` asks for the PDF, so it must be made. `download: true` in the headmatter alone only warns, like the
      // install icons: the site is built and its PDF button stays disabled.
      if (flags.download) await makePdf();
      else
        await makePdf().catch((error) =>
          console.warn(
            `No PDF for the download button: ${String(error.message).split('\n')[0]} (pass --download to make this an error)`,
          ),
        );
    }
  } finally {
    await server?.close();
  }

  if (offline) {
    const { removed } = await makeOffline(dist);
    console.log(
      `Offline folder: one classic script (${removed} chunks folded in), no service worker, hash routing.`,
    );
    return;
  }

  // GitHub Pages answers an unknown address with 404.html; Netlify reads _redirects. Both send it to the app.
  copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
  writeFileSync(join(dist, '_redirects'), `${base}*    ${base}index.html   200\n`);
  if (pwaEnabled(head)) {
    await makeIcons(
      head,
      root,
      dist,
      flags['executable-path'] ?? process.env.CHROME_PATH,
      flags['no-sandbox'],
    );
    console.log(`Offline support: ${writePwa(dist, head)} files for the service worker.`);
  }
}

// The slide.ng icons are copied. A picture of your own is drawn at the sizes with a browser; without one the
// deck still works offline, it just cannot be installed.
async function makeIcons(head, root, dist, executablePath, noSandbox) {
  const source = iconSource(head, root);
  if (source.kind === 'default') {
    copyDefaultIcons(dist);
    console.log('Install icons: the slide.ng icons (put icon.png in public/ to use your own).');
    return;
  }
  let browser;
  try {
    browser = await launchBrowser(executablePath, { noSandbox });
    await writeIcons(dist, source, browser);
    console.log(`Install icons from ${source.path}.`);
  } catch (error) {
    console.warn(`No install icons: ${String(error.message).split('\n')[0]}`);
  } finally {
    await browser?.close();
  }
}
