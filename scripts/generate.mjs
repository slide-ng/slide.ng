// Reads slides.md and writes one Angular component per slide into
// src/slides/generated/, plus an index.ts and uno.css (the CSS for the class names in use). Usage: node scripts/generate.mjs [--watch]
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  watch,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { coalesce } from './lib/coalesce.mjs';
import { offerInstall } from './lib/install-root.mjs';
import { parseDeck } from './lib/parse-deck.mjs';
import { RootNotFoundError } from './lib/roots.mjs';
import { checkToolDir } from './lib/tool-dir.mjs';
import { ROOT_FOLDERS } from './lib/roots.mjs';
import { slideName, slideSource } from './lib/emit.mjs';
import { indexSource } from './lib/index-source.mjs';
import { layoutName } from './lib/layouts.mjs';
import { makeCss, tsFiles } from './lib/make-css.mjs';
import { detectFeatures } from './lib/features.mjs';
import { initHighlighter } from './lib/code/highlighter.mjs';
import { setKatexOptions } from './lib/math.mjs';
import { katexOptions, shikiSetup, transformersSetup } from './lib/setup/node-setups.mjs';
import { applyPreTransformers } from './lib/setup/pre-transform.mjs';
import { readDrawings } from './lib/drawings.mjs';
import { applyRoots } from './lib/theme-files.mjs';
import { monacoWriteTargets, resetMonacoWriteTargets } from './lib/code/monaco.mjs';
import { applyOffline, buildOptions, wantsRemoteAssets } from './lib/build-options.mjs';
import { headParts, renderIndexHtml } from './lib/head.mjs';
import { bundleRemoteAssets, emptyFolder } from './lib/remote-assets.mjs';
import { bundleFonts, wantsFontFiles } from './lib/font-bundle.mjs';
import { ogImageAddress, ogImagePlan } from './build/og-image.mjs';
import { pwaEnabled } from './build/pwa.mjs';

// `slide-ng --theme <name|path>` reaches the generator through this variable.
const THEME = process.env.SLIDE_NG_THEME || undefined;

// SLIDES_FILE lets tests build another deck.
const INPUT = process.env.SLIDES_FILE ?? 'slides.md';
const OUT = 'src/slides/generated/';

// Only write when the text changed, so the dev server does not rebuild for nothing.
function write(path, text) {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path, text);
}

// Stylesheets of the features that bring their own CSS, added to the app only when the deck uses them: KaTeX's CSS (and fonts),
// Magic Move's and Twoslash's CSS, and Monaco's CSS (it carries its icon font inside). Monaco's package maps `exports` to JavaScript only, so its CSS is reached by path.
function featureCss(features) {
  const imports = [];
  if (features.math)
    imports.push(
      "@import 'katex/dist/katex.min.css';",
      '.slidev-layout .katex { direction: ltr; unicode-bidi: isolate; } /* math reads left to right in an RTL deck */',
    );
  if (features.magicMove) imports.push("@import '@shikijs/magic-move/style.css';");
  if (features.twoslash) imports.push("@import '@shikijs/twoslash/style-rich.css';");
  if (features.monaco)
    imports.push("@import '../../../node_modules/monaco-editor/min/vs/editor/editor.main.css';");
  return imports.length ? imports.join('\n') + '\n' : '/* no feature styles needed */\n';
}

// The editors that may save to a file (`{monaco-write}`). The dev server reads this list; see scripts/dev/monaco-write.mjs.
function writeMonacoTargets(root) {
  const targets = monacoWriteTargets();
  const file = `${root}/.slide-ng/monaco-files.json`;
  if (!Object.keys(targets).length && !existsSync(file)) return;
  checkToolDir(root);
  mkdirSync(`${root}/.slide-ng`, { recursive: true });
  write(file, JSON.stringify(targets, null, 2) + '\n');
}

// The page itself (src/index.html is the template): title, description, social tags, favicon, manifest link.
function writeIndexHtml(deck, base) {
  const warn = (m) => console.warn(`[slides] ${m}`);
  const plan = ogImagePlan(deck.headmatter, deck.root);
  const ogImage =
    plan.kind === 'file' || plan.kind === 'auto' ? ogImageAddress(deck.headmatter, base) : null;
  const parts = headParts(deck.headmatter, { ogImage, pwa: pwaEnabled(deck.headmatter), warn });
  write(`${OUT}index.html`, renderIndexHtml(readFileSync('src/index.html', 'utf8'), parts, warn));
}

// A missing theme or addon: in a terminal the first run offers to install it (like Slidev); otherwise the error stops the run.
let deckRead = false;
async function readDeck() {
  try {
    return await parseDeck(INPUT, undefined, { theme: THEME });
  } catch (e) {
    if (!(e instanceof RootNotFoundError) || deckRead || process.argv.includes('--watch')) throw e;
    if (!(await offerInstall(e, dirname(resolve(INPUT))))) throw e;
    return parseDeck(INPUT, undefined, { theme: THEME });
  }
}

async function generate() {
  const deck = await readDeck();
  deckRead = true;
  const build = buildOptions();
  deck.problems.forEach((p) => console.warn(`[slides] ${p}`));
  // Options of `slide-ng build` (see lib/build-options.mjs).
  if (build.download && deck.headmatter.download == null) deck.headmatter.download = true;
  if (build.withoutNotes)
    deck.slides.forEach((s) => {
      s.note = null;
    });
  if (build.offline) applyOffline(deck.headmatter);
  deck.assetBase = build.building ? build.base : '/';
  mkdirSync(OUT, { recursive: true });
  // Remote pictures are fetched into the build only for a production build with `remoteAssets: true`.
  if (wantsRemoteAssets(deck.headmatter, build.building, build.offline)) {
    const n = await bundleRemoteAssets(deck.slides, `${OUT}remote-assets`, (m) =>
      console.warn(`[slides] ${m}`),
    );
    console.log(`[slides] bundled ${n} remote images`);
  } else emptyFolder(`${OUT}remote-assets`);
  // Web fonts are downloaded into the build for an offline folder, a deck with `pwa`, or `fonts: { selfHost: true }` (see lib/font-bundle.mjs).
  if (wantsFontFiles(deck.headmatter, build)) {
    const bundled = await bundleFonts(deck.headmatter, `${OUT}fonts`, (m) =>
      console.warn(`[slides] ${m}`),
    );
    deck.fontFaces = bundled?.css ?? null;
    if (bundled) console.log(`[slides] bundled ${bundled.files} font files`);
  } else emptyFolder(`${OUT}fonts`);
  writeIndexHtml(deck, build.base);
  deck.drawings = readDrawings(deck.root, deck.headmatter);
  // Themes and addons: copies them into the app, finds their layouts, components and layers (see lib/theme-files.mjs).
  const { unoConfigs } = await applyRoots(deck, OUT, write, (m) => console.warn(`[slides] ${m}`));
  // Decide each layout once, so that an unknown name is reported once.
  deck.slides.forEach((s, i) => (s.layout = layoutName(s.frontmatter, i, deck.layouts)));
  // setup/katex.ts, setup/transformers.ts and setup/shiki.ts of the roots (docs/SETUP.md).
  setKatexOptions(await katexOptions(deck.roots));
  deck.transformers = await transformersSetup(deck.roots);
  await applyPreTransformers(deck.slides, deck.transformers.pre, deck.headmatter);
  const features = detectFeatures(deck.slides);
  await initHighlighter({
    langs: features.langs,
    headmatter: deck.headmatter,
    twoslash: features.twoslash,
    setup: await shikiSetup(deck.roots),
  });
  const wanted = new Set(
    deck.slides
      .map((_, i) => `${slideName(i + 1)}.ts`)
      .concat(
        'index.ts',
        'index.html',
        'layers.ts',
        'setup.ts',
        'theme.css',
        'uno.css',
        'features.css',
        'remote-assets',
        'fonts',
        'roots',
        'public',
      ),
  );
  for (const f of readdirSync(OUT)) if (!wanted.has(f)) rmSync(OUT + f, { recursive: true });
  resetMonacoWriteTargets();
  deck.slides.forEach((s, i) => write(`${OUT}${slideName(i + 1)}.ts`, slideSource(s, i + 1, deck)));
  writeMonacoTargets(deck.root);
  write(`${OUT}index.ts`, indexSource(deck));
  write(`${OUT}features.css`, featureCss(features));
  // The generated slides are scanned too: icon tags and alerts only become class names there.
  const slideFiles = deck.slides.map((_, i) => `${OUT}${slideName(i + 1)}.ts`);
  write(
    `${OUT}uno.css`,
    await makeCss(
      [...deck.files, ...slideFiles, ...tsFiles('src/app'), ...tsFiles(`${OUT}roots`)],
      unoConfigs,
    ),
  );
  console.log(`[slides] generated ${deck.slides.length} slides`);
  return { files: deck.files, folders: rootFolders(deck.roots) };
}

// What to watch for the roots: a theme or addon folder as a whole, and only the known folders of the deck's own folder
// (the rest of it is the deck's files, `node_modules` and so on).
const rootFolders = (roots) =>
  roots
    .flatMap((r) => (r.kind === 'deck' ? ROOT_FOLDERS.map((f) => join(r.dir, f)) : [r.dir]))
    .filter((d) => existsSync(d));

const { files, folders } = await generate();
if (process.argv.includes('--watch')) {
  let timer;
  const watched = new Set();
  // Runs never overlap: generating uses shared state, and a change during a run asks for one more run.
  const regenerate = coalesce(() =>
    generate()
      .then(watchAll)
      .catch((e) => console.error(e.message)),
  );
  // Editors save in bursts; wait a moment so we generate once.
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(regenerate, 100);
  };
  // The entry file, every file it imports with `src:`, and the folders of themes and addons.
  const watchAll = ({ files, folders }) => {
    for (const f of files) if (!watched.has(f)) (watched.add(f), watch(f, onChange));
    for (const d of folders)
      if (!watched.has(d)) (watched.add(d), watch(d, { recursive: true }, onChange));
  };
  watchAll({ files, folders });
  watch('src/app', { recursive: true }, onChange); // layouts may use new class names
  console.log(`[slides] watching ${INPUT} (and its imports), its theme folders and src/app`);
}
