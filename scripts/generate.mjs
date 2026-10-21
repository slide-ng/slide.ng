// Reads slides.md and writes one Angular component per slide into
// src/slides/generated/, plus an index.ts and uno.css (the CSS for the class names in use). Usage: node scripts/generate.mjs [--watch]
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { coalesce } from './lib/coalesce.mjs';
import { watchFolder } from './lib/watch-folder.mjs';
import { offerInstall } from './lib/install-root.mjs';
import { parseDeck } from './lib/parse-deck.mjs';
import { RootNotFoundError } from './lib/roots.mjs';
import { copyLocalAssets } from './lib/local-assets.mjs';
import { checkToolDir } from './lib/tool-dir.mjs';
import { ROOT_FOLDERS } from './lib/roots.mjs';
import { slideName, slideSources, sourcePathsModule } from './lib/emit.mjs';
import { indexSource } from './lib/index-source.mjs';
import { layoutName } from './lib/layouts.mjs';
import { makeCss, tsFiles } from './lib/make-css.mjs';
import { slideStyleDirectives } from './lib/uno-directives.mjs';
import { detectFeatures } from './lib/features.mjs';
import { initHighlighter } from './lib/code/highlighter.mjs';
import { snippetFiles } from './lib/code/snippet.mjs';
import { setKatexOptions } from './lib/math.mjs';
import { katexOptions, shikiSetup, transformersSetup } from './lib/setup/node-setups.mjs';
import { applyPreTransformers } from './lib/setup/pre-transform.mjs';
import { readDrawings } from './lib/drawings.mjs';
import { applyRoots } from './lib/theme-files.mjs';
import { monacoWriteTargets, resetMonacoWriteTargets } from './lib/code/monaco.mjs';
import { applyOffline, buildOptions, modeSwitch, wantsRemoteAssets } from './lib/build-options.mjs';
import { headParts, renderIndexHtml } from './lib/head.mjs';
import { deckUiText, uiTextSource } from './lib/ui-text.mjs';
import { langOverride } from './lib/lang.mjs';
import { injectIndexHtml, rootIndexHtml } from './lib/index-html.mjs';
import { bundleRemoteAssets, emptyFolder } from './lib/remote-assets.mjs';
import { bundleFonts, wantsFontFiles } from './lib/font-bundle.mjs';
import { ogImageAddress, ogImagePlan } from './build/og-image.mjs';
import { pwaEnabled } from './build/pwa.mjs';

// `slide-ng --theme <name|path>` reaches the generator through this variable.
const THEME = process.env.SLIDE_NG_THEME || undefined;
// `slide-ng build --lang tr` sets the headmatter's `lang` and `uiLang` for this run (docs/UI-STRINGS.md).
const LANG = process.env.SLIDE_NG_LANG || undefined;

// SLIDES_FILE lets tests build another deck.
const INPUT = process.env.SLIDES_FILE ?? 'slides.md';
const OUT = 'src/slides/generated/';

const WATCH = process.argv.includes('--watch');

// What the dev server's banner says (dev/problem-banner.ts): `lastGood` when the slides on screen are the last good ones.
const writeProblem = (text, lastGood) =>
  write(
    `${OUT}problem.ts`,
    `export const PROBLEM = ${JSON.stringify(text)};\nexport const LAST_GOOD = ${lastGood};\n`,
  );

// Only write when the text changed, so the dev server does not rebuild for nothing.
function write(path, text) {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path, text);
}

// Stylesheets of the features that bring their own CSS, added to the app only when the deck uses them: KaTeX's CSS (and fonts),
// Magic Move's and Twoslash's CSS. Monaco's CSS is not here: it comes with the lazy Monaco chunk (src/app/code/monaco/setup.ts).
function featureCss(features) {
  const imports = [];
  if (features.math) imports.push("@import 'katex/dist/katex.min.css';");
  if (features.magicMove) imports.push("@import '@shikijs/magic-move/style.css';");
  if (features.twoslash) imports.push("@import '@shikijs/twoslash/style-rich.css';");
  // Rules after every @import: an @import that follows a rule is ignored by the browser.
  if (features.math)
    imports.push(
      '.slidev-layout .katex { direction: ltr; unicode-bidi: isolate; } /* math reads left to right in an RTL deck */',
    );
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

// The page itself (src/index.html is the template): title, description, social tags, favicon, manifest link, then the
// `index.html` of each root (lib/index-html.mjs).
function writeIndexHtml(deck, base) {
  const warn = (m) => console.warn(`[slides] ${m}`);
  const plan = ogImagePlan(deck.headmatter, deck.root);
  const ogImage =
    plan.kind === 'file' || plan.kind === 'auto' ? ogImageAddress(deck.headmatter, base) : null;
  const parts = headParts(deck.headmatter, { ogImage, pwa: pwaEnabled(deck.headmatter), warn });
  const page = renderIndexHtml(readFileSync('src/index.html', 'utf8'), parts, warn);
  const { lang, htmlAttrs } = deck.headmatter;
  const defaults = lang || htmlAttrs?.lang ? [] : ['lang'];
  write(`${OUT}index.html`, injectIndexHtml(page, rootIndexHtml(deck.roots, base), defaults));
}

// A missing theme or addon: in a terminal the first run offers to install it (like Slidev); otherwise the error stops the run.
let deckRead = false;
async function readDeck() {
  try {
    return await parseDeck(INPUT, undefined, { theme: THEME });
  } catch (e) {
    if (!(e instanceof RootNotFoundError) || deckRead || WATCH) throw e;
    if (!(await offerInstall(e, dirname(resolve(INPUT))))) throw e;
    return parseDeck(INPUT, undefined, { theme: THEME });
  }
}

async function generate() {
  snippetFiles.clear();
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
  if (build.routerMode) deck.headmatter.routerMode = build.routerMode;
  if (build.offline) applyOffline(deck.headmatter);
  langOverride(deck.headmatter, LANG);
  deck.assetBase = build.building ? build.base : '/';
  // `monaco` and `twoslash` may be on in one mode only; off, `{monaco}` blocks are plain code and Twoslash does not run.
  deck.monaco = modeSwitch(deck.headmatter.monaco, build.dev);
  const twoslash = modeSwitch(deck.headmatter.twoslash, build.dev);
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
  const { unoConfigs, uno } = await applyRoots(deck, OUT, write, (m) =>
    console.warn(`[slides] ${m}`),
  );
  // Decide each layout once, so that an unknown name is reported once.
  deck.slides.forEach((s, i) => (s.layout = layoutName(s.frontmatter, i, deck.layouts)));
  // setup/katex.ts, setup/transformers.ts and setup/shiki.ts of the roots (docs/SETUP.md).
  setKatexOptions(await katexOptions(deck.roots));
  deck.transformers = await transformersSetup(deck.roots);
  await applyPreTransformers(deck.slides, deck.transformers.pre, deck.headmatter);
  const features = detectFeatures(deck.slides, { monaco: deck.monaco, twoslash });
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
        'local-assets',
        'fonts',
        'roots',
        'roots.json',
        'problem.ts',
        'ui-text.ts',
        'source-paths.ts',
        'public',
      ),
  );
  for (const f of readdirSync(OUT)) if (!wanted.has(f)) rmSync(OUT + f, { recursive: true });
  resetMonacoWriteTargets();
  deck.localAssets = new Set();
  // `@apply` and `--uno:` in the slides' <style> blocks (lib/uno-directives.mjs).
  deck.cssDirectives = await slideStyleDirectives(deck.slides, uno);
  const sources = slideSources(deck);
  sources.forEach((source, i) => write(`${OUT}${slideName(i + 1)}.ts`, source));
  // The dev server's error overlay in the page names the generated copies; dev/error-overlay-paths.ts names the author's files
  // instead. Only for the dev server (`--watch`): the folders of this computer have no place in a build.
  const dev = process.argv.includes('--watch');
  write(
    `${OUT}source-paths.ts`,
    sourcePathsModule(
      dev ? Object.fromEntries(deck.roots.map((r) => [r.id, r.dir])) : {},
      dev ? sources.map((s) => /^\/\/ GENERATED from (\S+)/.exec(s)?.[1] ?? '') : [],
    ),
  );
  copyLocalAssets(deck.root, deck.localAssets, `${OUT}local-assets`);
  writeMonacoTargets(deck.root);
  write(`${OUT}index.ts`, indexSource(deck));
  // The interface language, its translations and the locale of the pipes (lib/ui-text.mjs).
  write(
    `${OUT}ui-text.ts`,
    uiTextSource(await deckUiText(deck, (m) => console.warn(`[slides] ${m}`))),
  );
  // The dev server shows a generator error in the page (dev/problem-banner.ts); a good run clears it. Slides that could not be
  // imported (a missing `src:` file) are named there too, while the rest of the deck is shown.
  writeProblem(WATCH ? deck.importProblems.join('\n') : '', false);
  write(`${OUT}features.css`, featureCss(features));
  // The generated slides are scanned too: icon tags and alerts only become class names there.
  const slideFiles = deck.slides.map((_, i) => `${OUT}${slideName(i + 1)}.ts`);
  write(
    `${OUT}uno.css`,
    await makeCss([...deck.files, ...slideFiles, ...tsFiles(`${OUT}roots`)], unoConfigs, [
      ...tsFiles('src/app'),
    ]),
  );
  console.log(`[slides] generated ${deck.slides.length} slides`);
  // A file a {monaco-write} editor saves to is not watched: the editor shows it already, and a regeneration on each save would
  // take the focus from the editor while the speaker types.
  const written = new Set(Object.values(monacoWriteTargets()).map((p) => resolve(deck.root, p)));
  const snippets = [...snippetFiles].filter((f) => !written.has(f));
  // The deck's index.html is watched even before it exists, so that adding one shows up (themes are watched whole).
  const indexFile = join(deck.root, 'index.html');
  return {
    files: [...deck.files, ...deck.missing, ...snippets, indexFile],
    folders: rootFolders(deck.roots),
  };
}

// What to watch for the roots: a theme or addon folder as a whole, and only the known folders of the deck's own folder
// (the rest of it is the deck's files, `node_modules` and so on). A known folder that is not there yet is watched for too.
const rootFolders = (roots) =>
  roots
    .filter((r) => r.dir)
    .flatMap((r) => (r.kind === 'deck' ? ROOT_FOLDERS.map((f) => join(r.dir, f)) : [r.dir]));

// A failed first run prints its message, not Node's stack trace (SLIDE_NG_DEBUG=1 shows the stack).
let first;
try {
  first = await generate();
} catch (e) {
  console.error(`[slides] ${process.env.SLIDE_NG_DEBUG ? e.stack : e.message}`);
  process.exit(1);
}
const { files, folders } = first;
if (WATCH) {
  let timer;
  const watched = new Set();
  // Runs never overlap: generating uses shared state, and a change during a run asks for one more run.
  const regenerate = coalesce(() =>
    generate()
      .then(watchAll)
      .catch((e) => {
        console.error(e.message);
        writeProblem(e.message, true);
      }),
  );
  // Editors save in bursts; wait a moment so we generate once.
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(regenerate, 100);
  };
  // The entry file, every file it imports with `src:` or `<<<`, and the folders of themes and addons. A file is watched through
  // its folder: an editor that saves by writing a new file and renaming it over the old one ends a watch on the file itself.
  // Folders are watched one by one (lib/watch-folder.mjs), and again after one is deleted and made again.
  const names = new Map(); // folder -> the file names wanted in it
  const watchAll = ({ files, folders }) => {
    for (const f of files) {
      const dir = dirname(f);
      if (!names.has(dir)) {
        names.set(dir, new Set());
        watchFolder(dir, (_, name) => {
          if (!name || names.get(dir).has(name)) onChange();
        });
      }
      names.get(dir).add(basename(f));
    }
    for (const d of folders)
      if (!watched.has(d)) (watched.add(d), watchFolder(d, onChange, { tree: true }));
  };
  watchAll({ files, folders });
  watchFolder('src/app', onChange, { tree: true }); // layouts may use new class names
  console.log(`[slides] watching ${INPUT} (and its imports), its theme folders and src/app`);
}
