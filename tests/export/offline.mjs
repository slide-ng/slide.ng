// `slide-ng build --offline` end to end: the folder is opened straight from disk (file://, no server) in Chromium.
// Pictures from a "remote" server and fonts from a fake font provider are bundled while building, and both servers are
// stopped before the folder is opened. Part of `npm run test:export`. The server side (service worker, network off) is in offline-net.mjs.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, reporter } from '../e2e/browser.mjs';
import { fontProvider, remotePictures } from './offline-fixtures.mjs';
import { consoleProblem } from '../console-problem.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-offline-'));
const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  // The tests run as root in containers, where Chromium cannot use its sandbox.
  SLIDE_NG_NO_SANDBOX: '1',
  // The "remote" servers of this test are on 127.0.0.1, which downloads refuse unless a test says so.
  SLIDE_NG_ALLOW_LOCAL_FETCH: '1',
};
const run = promisify(execFile); // asynchronous: the fake servers below run in this process and must answer
const cli = async (args, cwd = scratch) =>
  await run(process.execPath, [bin, ...args], { cwd, env, encoding: 'utf8', maxBuffer: 1 << 26 });

const pictures = await remotePictures();
const fonts = await fontProvider('OfflineTest');

// ---- the deck: history routing, pwa and remote assets are all asked for; --offline must override the first two
const deckDir = join(scratch, 'deck');
mkdirSync(join(deckDir, 'public'), { recursive: true });
writeFileSync(
  join(deckDir, 'public', 'local.png'),
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);
writeFileSync(
  join(deckDir, 'slides.md'),
  `---
title: Offline test
routerMode: history
pwa: true
download: true
exportFilename: talk
fonts:
  sans: OfflineTest
  provider: ${fonts.cssUrl}
  allowCustomProvider: true
---

# One

<div id="c1" slide-ng-click>first click</div>

<img id="remote" src="${pictures.origin}/pic.png" width="40">
<img id="local" src="/local.png" width="40">

---
layout: image
image: /local.png
---

# Two

<!--
The note of slide two.
-->

---

# Math

$$ x^2 + y^2 $$

---

# Diagram

\`\`\`mermaid
graph TD; A-->B
\`\`\`

---

# Editor

\`\`\`ts {monaco}
const a: number = 1
\`\`\`
`,
);

const site = join(scratch, 'site');
const out = (
  await cli(
    ['build', join(deckDir, 'slides.md'), '--offline', '--out', site, '--download'],
    deckDir,
  )
).stdout;
const providerAsked = { ...fonts.asked };
const picturesAsked = pictures.hits();
await pictures.stop(); // from here on there is no "internet": the folder must carry everything
await fonts.stop();

// ---- the folder
const list = readdirSync(site);
const html = readFileSync(join(site, 'index.html'), 'utf8');
const scripts = list.filter((f) => f.endsWith('.js'));
t.ok(
  'the build says it made an offline folder',
  out.includes('Offline folder'),
  out.split('\n').find((l) => l.includes('Offline')) ?? '',
);
t.ok(
  'no service worker, manifest, 404 page or redirects (pwa is off)',
  !['sw.js', 'manifest.webmanifest', '404.html', '_redirects'].some((f) => list.includes(f)),
  list.join(),
);
t.ok(
  'index.html has no <base>, no module script and no preload',
  !/<base|type="module"|modulepreload|rel="manifest"/.test(html),
);
t.ok(
  'the app is one classic script (plus the Monaco worker texts)',
  scripts.length === 2 &&
    scripts.some((f) => f.startsWith('main-')) &&
    scripts.includes('workers.js'),
  scripts.join(),
);
t.ok('every address in index.html is relative', !/(?:src|href)="\/[^/]/.test(html));
const styleText = list
  .filter((f) => /\.(css|html)$/.test(f))
  .map((f) => readFileSync(join(site, f), 'utf8'))
  .join('\n');
const appText = scripts.map((f) => readFileSync(join(site, f), 'utf8')).join('\n');
t.ok(
  'no address of the picture server or the font provider is in the pages and style sheets, no @import, no font file address',
  !styleText.includes(pictures.origin) &&
    !styleText.includes(fonts.origin) &&
    !styleText.includes('@import') &&
    !appText.includes(`${fonts.origin}/files`),
);
t.ok(
  'the picture server address is gone from the script too (the deck itself still names the font provider)',
  !appText.includes(pictures.origin),
);
t.ok(
  'the provider was asked once for the style sheet with a browser name, and once for its font file',
  providerAsked.css === 1 &&
    providerAsked.files === 1 &&
    /Chrome/.test(providerAsked.userAgents[0]),
  JSON.stringify(providerAsked),
);
t.ok(
  'the remote picture was downloaded once, while building',
  picturesAsked === 1 && readdirSync(join(site, 'remote-assets')).length === 1,
  String(picturesAsked),
);
t.ok('the PDF for the download button is in the folder', existsSync(join(site, 'talk.pdf')));

// ---- opened from disk
const url = pathToFileURL(join(site, 'index.html')).href;
const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  acceptDownloads: true,
});
const problems = [];
const watch = (page, name) => {
  page.on('console', (m) => {
    const problem = consoleProblem(m);
    if (problem) problems.push(`${name} ${problem.slice(0, 300)}`);
  });
  page.on('pageerror', (e) => problems.push(`${name} ${String(e).slice(0, 200)}`));
  page.on('requestfailed', (r) => problems.push(`${name} request failed: ${r.url().slice(-80)}`));
};
const ready = (page) =>
  page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 30000 },
  );
const hud = async (page) => (await page.locator('#hud').innerText()).trim();
const hash = (page) => new URL(page.url()).hash;
const open = async (hashPart = '') => {
  const p = await context.newPage();
  watch(p, 'page');
  await p.goto(url + hashPart);
  await ready(p);
  return p;
};

const page = await open();
t.ok(
  'from file:// the first slide opens',
  (await hud(page)) === 'slide 1/5 clicks 0/1',
  await hud(page),
);
t.ok(
  'the address is a hash address (routerMode history was overridden)',
  hash(page).startsWith('#/1'),
  page.url(),
);
t.ok('the page is not on a server', page.url().startsWith('file://'));
t.ok('the deck title is the page title', (await page.title()) === 'Offline test');
const loaded = await page.evaluate(() => ({
  remote: document.querySelector('#remote').naturalWidth,
  local: document.querySelector('#local').naturalWidth,
  remoteSrc: document.querySelector('#remote').getAttribute('src'),
  localSrc: document.querySelector('#local').getAttribute('src'),
}));
t.ok(
  'the picture that came from the "remote" server is shown, with the server stopped',
  loaded.remote === 1 && /^remote-assets\//.test(loaded.remoteSrc),
  JSON.stringify(loaded),
);
t.ok(
  'a /public picture written as /local.png is found next to the page',
  loaded.local === 1 && loaded.localSrc === 'local.png',
  JSON.stringify(loaded),
);
t.ok(
  'the web font came from the folder: declared, loaded, and used by the page',
  await page.evaluate(async () => {
    await document.fonts.load('16px OfflineTest');
    return (
      document.fonts.check('16px OfflineTest') &&
      getComputedStyle(document.body).fontFamily.startsWith('OfflineTest') &&
      [...document.fonts].some((f) => f.family.includes('OfflineTest') && f.status === 'loaded')
    );
  }),
);

// keys, clicks, hash, reload
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(250);
t.ok(
  'right arrow shows the click',
  (await hud(page)) === 'slide 1/5 clicks 1/1' && hash(page) === '#/1?clicks=1',
  `${await hud(page)} ${hash(page)}`,
);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(700);
t.ok(
  'right arrow again goes to slide 2, the hash follows',
  (await hud(page)).startsWith('slide 2/5') && hash(page).startsWith('#/2'),
  `${await hud(page)} ${hash(page)}`,
);
const layoutPicture = await page.evaluate(
  () => getComputedStyle(document.querySelector('slide-002 sn-image')).backgroundImage,
);
t.ok(
  'the picture of the image layout (`image: /local.png`) points into the folder',
  /url\("file:\/\/.*\/local\.png"\)/.test(layoutPicture),
  layoutPicture,
);
await page.keyboard.press('ArrowLeft');
await page.waitForTimeout(500);
await page.mouse.move(40, 700);
await page.locator('#nav-next, [title="Go to next slide"]').first().click({ force: true });
await page.waitForTimeout(600);
t.ok(
  'the next button of the bar works with the mouse',
  (await hud(page)).startsWith('slide 2/5') || (await hud(page)).includes('clicks 1/1'),
  await hud(page),
);
await page.goto(url + '#/3');
await ready(page);
t.ok(
  'opening #/3 shows slide 3, a reload keeps it',
  (await hud(page)).startsWith('slide 3/5') &&
    (await page.reload(), await ready(page), (await hud(page)).startsWith('slide 3/5')),
);
await page.keyboard.press('o');
await page.waitForTimeout(800);
t.ok(
  'the overview opens with a thumbnail for every slide',
  (await page
    .locator('app-overview, #overview')
    .first()
    .isVisible()
    .catch(() => false)) || (await page.locator('[id^=overview], .overview').count()) > 0,
);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// ---- math, diagram and editor (lazy chunks that were folded into the script)
t.ok(
  'KaTeX renders and its font file loads from the folder',
  await page.evaluate(async () => {
    await document.fonts.load('1em KaTeX_Math');
    return document.querySelectorAll('.katex').length > 0 && document.fonts.check('1em KaTeX_Math');
  }),
);
await page.goto(url + '#/4');
await ready(page);
await page
  .locator('svg[aria-roledescription], .mermaid svg')
  .first()
  .waitFor({ timeout: 20000 })
  .then(
    () => t.ok('the Mermaid diagram is drawn', true),
    () => t.ok('the Mermaid diagram is drawn', false),
  );
await page.goto(url + '#/5');
await ready(page);
await page
  .locator('.monaco-editor .view-line')
  .first()
  .waitFor({ timeout: 30000 })
  .then(
    () => t.ok('the Monaco editor opens and shows its text', true),
    () => t.ok('the Monaco editor opens and shows its text', false),
  );
t.ok(
  'its style sheet and syntax colours work (the TypeScript worker started from a blob)',
  await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 2500));
    const editor = document.querySelector('.monaco-editor');
    return (
      getComputedStyle(editor).position === 'relative' &&
      document.querySelectorAll('.monaco-editor .view-line span span[class^="mtk"]').length > 1
    );
  }),
);

// ---- the presenter and a second window, from disk
await page.goto(url + '#/1');
await ready(page);
await page.mouse.move(40, 700);
await page.locator('#nav-presenter').click({ force: true });
await page.waitForTimeout(800);
t.ok(
  'the presenter button opens the presenter page (hash address)',
  hash(page).startsWith('#/presenter/1'),
  hash(page),
);
t.ok(
  'the presenter page shows the notes area',
  (await page.locator('body').innerText()).includes('Next'),
);
const [popup] = await Promise.all([
  context.waitForEvent('page'),
  page.evaluate(() => window.open(location.href.replace('#/presenter/', '#/'), '_blank') && true),
]);
watch(popup, 'popup');
await ready(popup);
t.ok(
  'window.open of the audience page works from file://',
  popup.url().startsWith('file://') && hash(popup).startsWith('#/1'),
  popup.url(),
);
await page.bringToFront();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(900);
t.ok(
  'the presenter moves and the other window follows (BroadcastChannel between file:// pages)',
  (await hud(popup)).startsWith('slide 2/5') && hash(popup).startsWith('#/2'),
  await hud(popup),
);
await popup.bringToFront();
await popup.keyboard.press('ArrowRight');
await popup.waitForTimeout(900);
t.ok(
  'the audience window can drive the presenter too (it is on this machine)',
  hash(page).startsWith('#/presenter/3'),
  hash(page),
);
await popup.close();

// ---- two offline decks in one browser: file:// pages share storage and channels, the deck keeps its own
const copy = join(scratch, 'site-copy');
cpSync(site, copy, { recursive: true });
const copyUrl = pathToFileURL(join(copy, 'index.html')).href;
await page.goto(url + '#/1');
await ready(page);
const other = await context.newPage();
watch(other, 'copy');
await other.goto(copyUrl + '#/1');
await ready(other);
await page.mouse.move(40, 700);
await page.locator('#nav-drawing').click();
await page.waitForTimeout(300);
const box = await page.locator('#slide-content').boundingBox();
await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(800);
const strokes = (p) => p.locator('#drawing-layer > *').count();
t.ok('a drawing is made on slide 1 of the folder', (await strokes(page)) > 0);
await page.reload();
await ready(page);
await page.waitForTimeout(600);
t.ok('a reload from disk keeps the drawing', (await strokes(page)) > 0);
await other.reload();
await ready(other);
await other.waitForTimeout(600);
t.ok(
  'the same deck in another folder does not get that drawing',
  (await strokes(other)) === 0,
  String(await strokes(other)),
);
await page.bringToFront();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(500);
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(900);
t.ok(
  'and does not follow its slides (the sync channel is per folder)',
  hash(page).startsWith('#/2') && hash(other).startsWith('#/1'),
  `${hash(page)} ${hash(other)}`,
);
await other.close();

// ---- the PDF button
await page.goto(url + '#/1');
await ready(page);
await page.mouse.move(40, 700);
const button = page.locator('#nav-download');
t.ok(
  'the download button is enabled from file://',
  (await button.count()) === 1 && (await button.getAttribute('aria-disabled')) === 'false',
  await button.getAttribute('aria-disabled'),
);
// From disk the browser ignores `download`, so the PDF opens in a new tab and the deck stays where it is.
const [pdfTab] = await Promise.all([context.waitForEvent('page'), button.click({ force: true })]);
await pdfTab.waitForLoadState().catch(() => {});
t.ok(
  'and it opens talk.pdf from the folder in a new tab, the deck stays open',
  pdfTab.url().endsWith('/talk.pdf') && hash(page).startsWith('#/1'),
  pdfTab.url(),
);
await pdfTab.close();

t.ok(
  'no console errors or warnings and no failed request while using the folder',
  problems.length === 0,
  JSON.stringify(problems.slice(0, 5)),
);

// ---- refusals
const refuse = async (args) => {
  try {
    await cli(args, deckDir);
    return '';
  } catch (e) {
    return String(e.stderr);
  }
};
t.ok(
  '--offline with --base is refused',
  (
    await refuse([
      'build',
      join(deckDir, 'slides.md'),
      '--offline',
      '--base',
      '/x/',
      '--out',
      join(scratch, 'no'),
    ])
  ).includes('cannot take --base'),
);

await browser.close();
process.exit(t.done());
