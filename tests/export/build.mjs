// `slide-ng build` end to end: head tags, Open Graph image, remote assets, the PDF download, the offline worker,
// sub-path hosting (history and hash routing), and the refusals. Part of `npm run test:export`.
import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch, reporter } from '../e2e/browser.mjs';
import { serveDirectory } from '../../scripts/export/static-server.mjs';
import { consoleProblem } from '../console-problem.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-build-'));
const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  // The tests run as root in containers, where Chromium cannot use its sandbox.
  SLIDE_NG_NO_SANDBOX: '1',
  // The "remote" servers of this test are on 127.0.0.1, which downloads refuse unless a test says so.
  SLIDE_NG_ALLOW_LOCAL_FETCH: '1',
};
// Asynchronous, because the "remote" server below runs in this same process and must be able to answer.
const run = promisify(execFile);
const cli = async (args, cwd = scratch) =>
  (await run(process.execPath, [bin, ...args], { cwd, env, encoding: 'utf8' })).stdout;
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// The "remote": a local server that counts how often its picture is asked for.
let remoteHits = 0;
const remote = http.createServer((req, res) => {
  remoteHits++;
  res.setHeader('content-type', 'image/png');
  res.end(png);
});
await new Promise((ok) => remote.listen(0, '127.0.0.1', ok));
const remoteUrl = `http://127.0.0.1:${remote.address().port}`;

// ---- deck A: everything on, served under /talk/
const deckDir = join(scratch, 'deck-a');
mkdirSync(deckDir, { recursive: true });
writeFileSync(
  join(deckDir, 'slides.md'),
  `---
title: Build deck
titleTemplate: '%s | Talk'
info: |
  ## A deck for the build test
author: Test Author
keywords: [angular, slides]
lang: de
favicon: /favicon.ico
htmlAttrs:
  data-test: yes
seoMeta:
  ogImage: auto
  ogUrl: https://example.test/talk
  twitterCard: summary_large_image
download: true
exportFilename: talk
remoteAssets: true
pwa: true
---

# One

![remote](${remoteUrl}/pic.png)

---

# Two

<img id="second" src="${remoteUrl}/pic2.png" width="40">

<img id="pub" src="/favicon.ico" width="16">

<!-- a note that must be gone from the build -->
`,
);
// The deck's own index.html: its head and body are merged into the page (like Slidev). Its root addresses get the base,
// its <meta name> replaces the headmatter's, and the attributes of <html> and <body> are kept.
writeFileSync(
  join(deckDir, 'index.html'),
  `<html lang="fr" class="from-index">\n<head>\n  <meta name="deck-index" content="from the deck">\n  <meta name="keywords" content="from index.html">\n  <link rel="stylesheet" href="/brand.css">\n</head>\n<body data-index="yes">\n  <script>window.__deckIndex = 'ran';</script>\n  <script src="/brand.js"></script>\n  <script data-cfasync="false">window.__deckData = 'ran';</script>\n  <script type="module">window.__deckModule = 'ran';</script>\n</body>\n</html>\n`,
);
mkdirSync(join(deckDir, 'public'), { recursive: true });
writeFileSync(join(deckDir, 'public', 'brand.css'), 'body { --brand: on; }\n');
writeFileSync(join(deckDir, 'public', 'brand.js'), "window.__brandJs = 'ran';\n");
const site = join(scratch, 'site-a');
await cli(
  [
    'build',
    join(deckDir, 'slides.md'),
    '--base',
    '/talk/',
    '--out',
    site,
    '--download',
    '--without-notes',
  ],
  deckDir,
);
const list = readdirSync(site);
const hitsAfterBuild = remoteHits;
t.ok(
  'build writes the app, 404.html and _redirects',
  ['index.html', '404.html', '_redirects'].every((f) => list.includes(f)),
  list.join(),
);
t.ok(
  '_redirects sends every address under the base to index.html',
  readFileSync(join(site, '_redirects'), 'utf8').startsWith('/talk/*    /talk/index.html   200'),
);
t.ok(
  'the build folder is marked as ours, and the work folder is gone',
  list.includes('.slide-ng-build') && !existsSync(join(deckDir, '.slide-ng', 'build')),
);

// ---- head tags
const html = readFileSync(join(site, 'index.html'), 'utf8');
const has = (text, label) => t.ok(`index.html: ${label}`, html.includes(text), text);
has('<base href="/talk/">', 'base href from --base');
has('<html lang="de" data-test="yes"', 'lang and htmlAttrs');
has('<title>Build deck | Talk</title>', 'title with titleTemplate');
has('<meta name="description" content="A deck for the build test">', 'description from info');
has('<meta name="author" content="Test Author">', 'author');
has('<meta name="keywords" content="from index.html">', "keywords from the deck's index.html");
t.ok(
  'index.html: one keywords tag (the index.html one replaces it)',
  html.match(/name="keywords"/g).length === 1,
);
has(
  '<html lang="de" data-test="yes" class="from-index"',
  "<html>: the headmatter's lang, the index.html class",
);
has('<body data-index="yes">', '<body>: the index.html attributes');
has(
  '<link data-beasties-skip rel="stylesheet" href="/talk/brand.css">',
  'index.html stylesheet under the base',
);
has('<script src="/talk/brand.js"></script>', 'index.html script under the base');
has('<meta property="og:title" content="Build deck | Talk">', 'og:title defaults to the title');
has(
  '<meta property="og:image" content="https://example.test/talk/og-image.png">',
  'og:image from ogUrl',
);
has('<meta name="twitter:card" content="summary_large_image">', 'twitter:card');
has('<link rel="icon" href="favicon.ico" type="image/x-icon">', 'favicon');
has('<link rel="manifest" href="manifest.webmanifest">', 'manifest link');
// The deck's inline script is moved to a file like the others (a host may send script-src 'self'), right where it was.
const deckScript = /<\/app-root>\s*<script src="(inline-\w+\.js)"><\/script>/.exec(html)?.[1];
t.ok(
  "index.html: the deck's index.html head goes into the head, its body after the app",
  /<meta name="deck-index" content="from the deck">[\s\S]*<\/head>/.test(html) &&
    !!deckScript &&
    readFileSync(join(site, deckScript), 'utf8').includes("window.__deckIndex = 'ran';"),
);
t.ok(
  "index.html has no inline script (a host may send script-src 'self')",
  !/<script(?![^>]*\bsrc=)[^>]*>/.test(html) &&
    /<script src="inline-\w+\.js"><\/script>/.test(html),
  html.match(/<script[^>]*>/g)?.join(' '),
);
t.ok(
  "index.html: the deck's module and its script with other attributes are moved, keeping their attributes",
  /<script data-cfasync="false" src="inline-\w+\.js"><\/script>/.test(html) &&
    /<script type="module" src="inline-\w+\.js"><\/script>/.test(html),
  html.match(/<script[^>]*>/g)?.join(' '),
);
const ogSize = readFileSync(join(site, 'og-image.png'));
t.ok(
  'og-image.png is a screenshot of slide 1 (1470x828)',
  ogSize.readUInt32BE(16) === 1470 && ogSize.readUInt32BE(20) === 828,
  `${ogSize.readUInt32BE(16)}x${ogSize.readUInt32BE(20)}`,
);

// ---- remote assets
const assets = readdirSync(join(site, 'remote-assets'));
t.ok(
  'remoteAssets: both pictures were downloaded into the build',
  assets.length === 2 && assets.every((f) => f.endsWith('.png')),
  assets.join(),
);
const allJs = readdirSync(site)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(site, f), 'utf8'))
  .join('\n');
t.ok('no remote address is left in the app', !allJs.includes(remoteUrl));
t.ok('notes are removed with --without-notes', !allJs.includes('a note that must be gone'));
t.ok(
  'a static build has no /notes-edit page (it only opens with the dev server)',
  !allJs.includes('notes-edit-text'),
);
t.ok(
  "nor the dev server's early-keys script of that page",
  !allJs.includes('slideNgEarlyKeys') &&
    !readFileSync(join(site, 'index.html'), 'utf8').includes('slideNgEarlyKeys'),
);

// ---- download, and the PDF itself
const pdf = join(site, 'talk.pdf');
t.ok(
  '--download wrote <exportFilename>.pdf into the build with one page per slide',
  existsSync(pdf) && /Pages:\s+2/.test(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' })),
);
t.ok(
  'the PDF is not in the offline list, the pictures are',
  !readFileSync(join(site, 'sw.js'), 'utf8').includes('talk.pdf') &&
    readFileSync(join(site, 'sw.js'), 'utf8').includes('remote-assets/'),
);
t.ok(
  'manifest.webmanifest is there',
  JSON.parse(readFileSync(join(site, 'manifest.webmanifest'), 'utf8')).name === 'Build deck',
);

// ---- install icons: the slide.ng icons here (no public/icon.*), listed in the manifest and the offline list
const pngSize = (name) => {
  const b = readFileSync(join(site, name));
  return b.subarray(1, 4).toString() === 'PNG'
    ? `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`
    : 'not a png';
};
const manifest = JSON.parse(readFileSync(join(site, 'manifest.webmanifest'), 'utf8'));
t.ok(
  'the manifest lists 192, 512 and maskable 512 icons',
  JSON.stringify(manifest.icons.map((i) => [i.src, i.sizes, i.type, i.purpose])) ===
    JSON.stringify([
      ['pwa-icon-192.png', '192x192', 'image/png', 'any'],
      ['pwa-icon-512.png', '512x512', 'image/png', 'any'],
      ['pwa-icon-maskable-512.png', '512x512', 'image/png', 'maskable'],
    ]),
  JSON.stringify(manifest.icons),
);
t.ok(
  'the icon files are real PNGs of the listed sizes',
  manifest.icons.every((i) => pngSize(i.src) === i.sizes),
  manifest.icons.map((i) => pngSize(i.src)).join(),
);
t.ok(
  'the offline list contains the icons',
  manifest.icons.every((i) => readFileSync(join(site, 'sw.js'), 'utf8').includes(`"${i.src}"`)),
);

// ---- in a browser, under /talk/
const served = await serveDirectory(site, '/talk/');
const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  acceptDownloads: true,
});
const problems = [];
const page = await context.newPage();
page.on('console', (m) => {
  const problem = consoleProblem(m);
  if (problem) problems.push(problem);
});
page.on('pageerror', (e) => problems.push(String(e)));
page.on('response', (r) => {
  if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
});
// A host with a strict Content-Security-Policy (docs/HOSTING.md): no inline script runs, the deck still gets its styles.
const strict = await browser.newContext({ serviceWorkers: 'block' });
await strict.route('**/*', async (route) => {
  const response = await route.fetch();
  const csp =
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";
  await route.fulfill({
    response,
    headers: { ...response.headers(), 'content-security-policy': csp },
  });
});
const strictPage = await strict.newPage();
const refused = [];
strictPage.on('console', (m) => {
  if (/Content Security Policy/i.test(m.text())) refused.push(m.text());
});
await strictPage.goto(`${served.origin}/talk/2`);
await strictPage.locator('#hud').waitFor();
t.ok(
  "under script-src 'self' the full stylesheet is switched on and nothing is refused",
  (await strictPage.evaluate(() =>
    // The deck's own index.html adds a plain <link rel="stylesheet"> (no media); the app's is switched from print to all.
    [...document.querySelectorAll('link[rel=stylesheet]')].every(
      (l) => !l.media || l.media === 'all',
    ),
  )) && refused.length === 0,
  refused.join(' | '),
);
await strictPage
  .waitForFunction(() => window.__deckModule === 'ran', null, { timeout: 5000 })
  .catch(() => {});
t.ok(
  "under script-src 'self' the deck's inline scripts ran from their files (a module and data-cfasync too)",
  await strictPage.evaluate(
    () =>
      window.__deckIndex === 'ran' && window.__deckData === 'ran' && window.__deckModule === 'ran',
  ),
);
// Requests still in flight (a lazy chunk) would be fulfilled after the close.
await strict.unrouteAll({ behavior: 'ignoreErrors' });
await strict.close();

await page.goto(`${served.origin}/talk/2`);
await page.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok(
  'a deep link under the base opens that slide (history routing)',
  (await page.locator('#hud').innerText()).startsWith('slide 2/2'),
);
t.ok(
  'the document title uses the template',
  (await page.title()).endsWith('| Talk'),
  await page.title(),
);
await page.waitForFunction(() => document.querySelector('#second')?.complete);
const img = await page
  .locator('#second')
  .evaluate((e) => ({ src: e.getAttribute('src'), ok: e.naturalWidth > 0 }));
t.ok(
  'the picture comes from the build, not from the remote server',
  /^remote-assets\/\w+\.png$/.test(img.src) && img.ok && remoteHits === hitsAfterBuild,
  `${img.src} hits ${remoteHits - hitsAfterBuild}`,
);
await page.waitForFunction(() => document.querySelector('#pub')?.complete);
const pub = await page
  .locator('#pub')
  .evaluate((e) => ({ src: e.getAttribute('src'), ok: e.naturalWidth > 0 }));
t.ok(
  'a /public picture written as /favicon.ico gets the base in front (/talk/favicon.ico) and loads',
  pub.src === '/talk/favicon.ico' && pub.ok,
  JSON.stringify(pub),
);
t.ok(
  "the script of the deck's index.html body ran",
  (await page.evaluate(() => window.__deckIndex)) === 'ran',
);
t.ok(
  "the deck's index.html loads /brand.js and /brand.css from under the base",
  await page.evaluate(
    () =>
      window.__brandJs === 'ran' &&
      getComputedStyle(document.body).getPropertyValue('--brand').trim() === 'on',
  ),
);
t.ok(
  'the lang and attributes are on <html>',
  await page.evaluate(
    () => document.documentElement.lang === 'de' && document.documentElement.dataset.test === 'yes',
  ),
);

await page.mouse.move(40, 700);
const button = page.locator('#nav-download');
t.ok(
  'the nav bar has an enabled download button',
  (await button.count()) === 1 && (await button.getAttribute('aria-disabled')) === 'false',
  await button.getAttribute('aria-disabled'),
);
const [download] = await Promise.all([
  page.waitForEvent('download'),
  button.click({ force: true }),
]);
t.ok(
  'clicking it downloads talk.pdf',
  download.suggestedFilename() === 'talk.pdf',
  download.suggestedFilename(),
);

// ---- offline: the worker stores everything, and the deck opens with the server gone
await page.waitForFunction(
  () => navigator.serviceWorker.getRegistration().then((r) => r?.active),
  null,
  { timeout: 20000 },
);
const scope = await page.evaluate(() =>
  navigator.serviceWorker.getRegistration().then((r) => r.scope),
);
t.ok(
  'the service worker is registered with the base as scope',
  scope === `${served.origin}/talk/`,
  scope,
);
await page.waitForFunction(() => caches.keys().then((k) => k.length > 0), null, { timeout: 20000 });
const cached = await page.evaluate(async () => {
  const c = await caches.open((await caches.keys())[0]);
  return (await c.keys()).length;
});
t.ok('the cache holds the deck', cached >= 5, String(cached));
const badge = page.locator('#offline-badge');
await badge.waitFor({ timeout: 20000 });
t.ok(
  'the badge says "Available offline" once the worker has stored the deck',
  (await badge.innerText()) === 'Available offline',
  await badge.innerText(),
);
await context.setOffline(true);
await page
  .waitForFunction(
    () => document.querySelector('#offline-badge')?.textContent?.trim() === 'Offline',
    null,
    { timeout: 5000 },
  )
  .then(
    () => t.ok('the badge says "Offline" when the browser goes offline', true),
    async () =>
      t.ok(
        'the badge says "Offline" when the browser goes offline',
        false,
        await badge.innerText(),
      ),
  );
await context.setOffline(false);
await page
  .waitForFunction(
    () => document.querySelector('#offline-badge')?.textContent?.trim() === 'Available offline',
    null,
    { timeout: 5000 },
  )
  .then(
    () => t.ok('and goes back to "Available offline" when the network returns', true),
    () => t.ok('and goes back to "Available offline" when the network returns', false),
  );
await page.reload(); // now the worker controls the page
await page.waitForFunction(() => navigator.serviceWorker.controller);
const problemsBeforeStop = problems.length; // the PDF check fails once the server is gone, which is expected
await served.close(); // the server is gone; only the worker can answer now
await page.reload();
await page
  .waitForFunction(() => /slide 2\/2/.test(document.querySelector('#hud')?.innerText ?? ''), null, {
    timeout: 15000,
  })
  .then(
    () =>
      t.ok('with the server stopped the deck still opens from the cache, at the same slide', true),
    () =>
      t.ok(
        'with the server stopped the deck still opens from the cache, at the same slide',
        false,
        'the page did not load',
      ),
  );
t.ok(
  'no console errors or warnings while the server was up',
  problemsBeforeStop === 0,
  JSON.stringify(problems.slice(0, problemsBeforeStop)),
);

// ---- deck C: pwa with the deck's own public/icon.svg, and no badge when pwa is off (deck B below)
const dirC = join(scratch, 'deck-c');
mkdirSync(join(dirC, 'public'), { recursive: true });
writeFileSync(join(dirC, 'slides.md'), '---\ntitle: Deck C\npwa: true\n---\n\n# Only\n');
writeFileSync(
  join(dirC, 'public', 'icon.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#d33"/></svg>',
);
const siteC = join(scratch, 'site-c');
const outC = await cli(['build', join(dirC, 'slides.md'), '--out', siteC], dirC);
t.ok('a public/icon.svg is used as the icon source', outC.includes('icon.svg'), outC);
const iconC = readFileSync(join(siteC, 'pwa-icon-192.png'));
t.ok(
  'its icons are PNGs of the right size',
  iconC.readUInt32BE(16) === 192 &&
    readFileSync(join(siteC, 'pwa-icon-maskable-512.png')).readUInt32BE(16) === 512,
);

// ---- deck D: its options only in slide-ng.config.yaml, slides.md has no headmatter
const dirD = join(scratch, 'deck-d');
mkdirSync(dirD, { recursive: true });
writeFileSync(join(dirD, 'slides.md'), '# First\n\n---\n\n# Second\n');
writeFileSync(
  join(dirD, 'slide-ng.config.yaml'),
  "title: Deck D\ntitleTemplate: '%s | From config'\nlang: tr\nhtmlAttrs:\n  data-config: yes\nrouterMode: hash\n",
);
const siteD = join(scratch, 'site-d');
await cli(['build', join(dirD, 'slides.md'), '--out', siteD], dirD);
const htmlD = readFileSync(join(siteD, 'index.html'), 'utf8');
t.ok(
  'a deck with a config file only: the page has its title, lang and attributes',
  htmlD.includes('<title>Deck D | From config</title>') &&
    /<html[^>]*lang="tr"/.test(htmlD) &&
    /<html[^>]*data-config="yes"/.test(htmlD),
  htmlD.slice(0, 600),
);
const servedD = await serveDirectory(siteD, '/');
const pageD = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await pageD.goto(`${servedD.origin}/#/2`);
await pageD.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok(
  "the config file's routerMode: hash opens #/2 on slide 2",
  (await pageD.locator('#hud').innerText()).startsWith('slide 2/2'),
);
await pageD.close();
await servedD.close();
writeFileSync(join(dirD, 'slide-ng.config.yaml'), 'title: [unclosed\n');
let brokenD = '';
try {
  await cli(['build', join(dirD, 'slides.md'), '--out', siteD], dirD);
} catch (e) {
  brokenD = String(e.stderr);
}
t.ok(
  'a config file that is not valid YAML stops the build with its file and line',
  brokenD.includes(`${join(dirD, 'slide-ng.config.yaml')}:1: the config file is not valid YAML`),
  brokenD,
);

// ---- deck B: hash routing under a nested base, built twice into the same folder
const dirB = join(scratch, 'deck-b');
mkdirSync(dirB, { recursive: true });
writeFileSync(
  join(dirB, 'slides.md'),
  '---\ntitle: Deck B\nrouterMode: hash\n---\n\n# First\n\n[To the second](2)\n\n---\n\n# Second\n',
);
const siteB = join(scratch, 'site-b');
await cli(['build', join(dirB, 'slides.md'), '--base', 'sub/dir', '--out', siteB], dirB);
await cli(['build', join(dirB, 'slides.md'), '--base', '/sub/dir/', '--out', siteB], dirB); // the marker lets the second build replace the first
const servedB = await serveDirectory(siteB, '/sub/dir/');
const pageB = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await pageB.goto(`${servedB.origin}/sub/dir/#/2`);
await pageB.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok(
  'hash routing under /sub/dir/: #/2 opens slide 2 after a reload, and the base is normalised',
  (await pageB.locator('#hud').innerText()).startsWith('slide 2/2') &&
    readFileSync(join(siteB, 'index.html'), 'utf8').includes('<base href="/sub/dir/">'),
);
t.ok(
  'a build without pwa, download or og image has none of those files',
  !existsSync(join(siteB, 'sw.js')) &&
    !existsSync(join(siteB, 'og-image.png')) &&
    !readdirSync(siteB).some((f) => f.endsWith('.pdf')),
  readdirSync(siteB).join(),
);
t.ok('without pwa there is no badge', (await pageB.locator('#offline-badge').count()) === 0);
await pageB.close();
await servedB.close();

// ---- deck B again with --router-mode memory: the flag wins over `routerMode: hash`, the address never changes
const siteM = join(scratch, 'site-m');
await cli(
  [
    'build',
    join(dirB, 'slides.md'),
    '--router-mode',
    'memory',
    '--base',
    '/m/',
    '--download',
    '--out',
    siteM,
  ],
  dirB,
);
const pdfM = join(siteM, 'slides-export.pdf');
t.ok(
  'memory routing: the PDF of --download still has one page per slide (the print page is read from the address)',
  existsSync(pdfM) && /Pages:\s+2/.test(execFileSync('pdfinfo', [pdfM], { encoding: 'utf8' })),
  readdirSync(siteM).join(),
);
// The headmatter says hash, the build says memory: `export --dist` goes by the build.
const pdfMDist = join(scratch, 'm-dist.pdf');
await cli(
  [
    'export',
    join(dirB, 'slides.md'),
    '--dist',
    siteM,
    '--base',
    '/m/',
    '--output',
    pdfMDist.replace(/\.pdf$/, ''),
  ],
  dirB,
);
t.ok(
  'export --dist of a --router-mode memory build has one page per slide (the build, not the headmatter, picks the addresses)',
  existsSync(pdfMDist) &&
    /Pages:\s+2/.test(execFileSync('pdfinfo', [pdfMDist], { encoding: 'utf8' })),
);
const servedM = await serveDirectory(siteM, '/m/');
const pageM = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await pageM.goto(`${servedM.origin}/m/2`);
const hudM = () => pageM.locator('#hud').innerText();
await pageM.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok('memory routing: a deep link opens slide 1', (await hudM()).startsWith('slide 1/2'));
await pageM.keyboard.press('ArrowRight');
await pageM.waitForFunction(() =>
  (document.querySelector('#hud')?.innerText ?? '').startsWith('slide 2/2'),
);
t.ok(
  'memory routing: moving to slide 2 leaves the address as it was',
  pageM.url() === `${servedM.origin}/m/2`,
  pageM.url(),
);
// A slide link's href opens its slide in a new tab: memory mode reads `#/<number>` once, then drops it from the address.
await pageM.keyboard.press('ArrowLeft');
const linkM = await pageM.locator('slide-ng-link a').getAttribute('href');
t.ok(
  "memory routing: a slide link's href is the deck's address with #/2",
  linkM === '/m/#/2',
  linkM,
);
await pageM.goto(`${servedM.origin}${linkM}`);
await pageM.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok(
  "memory routing: the link's href opened in a new tab shows slide 2, and the address drops the #/2",
  (await hudM()).startsWith('slide 2/2') && pageM.url() === `${servedM.origin}/m/`,
  `${await hudM()} ${pageM.url()}`,
);
await pageM.close();
await servedM.close();
// ---- several decks in one run: one folder each under --out, with the base adjusted per deck (like Slidev)
const multiDir = join(scratch, 'multi');
mkdirSync(multiDir, { recursive: true });
for (const name of ['alpha', 'beta'])
  writeFileSync(join(multiDir, `${name}.md`), `---\ntitle: ${name}\n---\n\n# ${name}\n`);
// Into the folder that holds deck B's single build: its index.html and _redirects must go.
const siteMulti = siteB;
const multiOut = await cli(
  [
    'build',
    join(multiDir, 'alpha.md'),
    join(multiDir, 'beta.md'),
    '--base',
    '/decks/',
    '--out',
    siteMulti,
  ],
  multiDir,
);
t.ok(
  'build a.md b.md writes <out>/a and <out>/b, each with the base /decks/<name>/',
  ['alpha', 'beta'].every(
    (name) =>
      readFileSync(join(siteMulti, name, 'index.html'), 'utf8').includes(
        `<base href="/decks/${name}/">`,
      ) && multiOut.includes(`into ${join(siteMulti, name)} (base /decks/${name}/)`),
  ),
  multiOut,
);
t.ok(
  'the earlier single build in --out is replaced: only the deck folders and the marker are left',
  readdirSync(siteMulti).sort().join() === '.slide-ng-build,alpha,beta',
  readdirSync(siteMulti).join(),
);
const servedMulti = await serveDirectory(join(siteMulti, 'beta'), '/decks/beta/');
const pageMulti = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await pageMulti.goto(`${servedMulti.origin}/decks/beta/1`);
await pageMulti.waitForFunction(() =>
  /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
);
t.ok(
  'the second deck opens under its own base',
  (await pageMulti.title()).includes('beta'),
  await pageMulti.title(),
);
await pageMulti.close();
await servedMulti.close();
// Exporting one deck of that build: --dist alone serves it under the base it was built with, and a --base that differs is refused.
const alphaPdf = join(multiDir, 'alpha-from-dist.pdf');
await cli(
  ['export', join(multiDir, 'alpha.md'), '--dist', join(siteMulti, 'alpha'), '--output', alphaPdf],
  multiDir,
);
t.ok(
  'export --dist of one deck of a multi build, without --base, uses the base in its index.html',
  existsSync(alphaPdf) && readFileSync(alphaPdf).subarray(0, 5).toString() === '%PDF-',
);

// ---- refusals: a folder with other files, and a base that is not a plain path
const precious = join(scratch, 'precious');
mkdirSync(precious);
writeFileSync(join(precious, 'thesis.txt'), 'do not delete');
const refuse = async (args) => {
  try {
    await cli(args, dirB);
    return '';
  } catch (e) {
    return String(e.stderr);
  }
};
t.ok(
  '--out into a folder with other files is refused and nothing is deleted',
  (await refuse(['build', join(dirB, 'slides.md'), '--out', precious])).includes(
    'not made by slide.ng',
  ) && existsSync(join(precious, 'thesis.txt')),
);
t.ok(
  '--out as the current folder is refused',
  (await refuse(['build', join(dirB, 'slides.md'), '--out', dirB])).includes(
    'contains the current folder',
  ),
);
t.ok(
  'export --dist with a --base other than the one the build was made with is refused',
  (
    await refuse([
      'export',
      join(multiDir, 'alpha.md'),
      '--dist',
      join(siteMulti, 'alpha'),
      '--base',
      '/',
    ])
  ).includes('which was made with the base /decks/alpha/'),
);
t.ok(
  '--base with .. is refused',
  (await refuse(['build', join(dirB, 'slides.md'), '--base', '/a/../b/'])).includes(
    '--base must be a path',
  ),
);
mkdirSync(join(multiDir, 'other'));
writeFileSync(join(multiDir, 'other', 'alpha.md'), '# other alpha\n');
t.ok(
  'two decks with the same file name are refused before anything is built',
  (
    await refuse(['build', join(multiDir, 'alpha.md'), join(multiDir, 'other', 'alpha.md')])
  ).includes('would both be built into'),
);
t.ok(
  '--router-mode takes history, hash or memory only',
  (await refuse(['build', join(dirB, 'slides.md'), '--router-mode', 'abstract'])).includes(
    '--router-mode must be one of history, hash, memory',
  ),
);
t.ok(
  '--offline with --router-mode memory is refused',
  (
    await refuse(['build', join(dirB, 'slides.md'), '--offline', '--router-mode', 'memory'])
  ).includes('cannot take --router-mode memory'),
);
t.ok(
  'a missing entry is refused before the first deck is built',
  (
    await refuse([
      'build',
      join(multiDir, 'alpha.md'),
      join(multiDir, 'missing.md'),
      '--out',
      join(scratch, 'never'),
    ])
  ).includes(`${join(multiDir, 'missing.md')} not found`) && !existsSync(join(scratch, 'never')),
);
await cli(['build', join(multiDir, 'alpha.md'), '--out', siteMulti], multiDir);
t.ok(
  'one deck can be built into the --out of several (it is marked as ours) and replaces it',
  existsSync(join(siteMulti, 'index.html')) &&
    !existsSync(join(siteMulti, 'alpha')) &&
    !existsSync(join(siteMulti, 'beta')),
  readdirSync(siteMulti).join(),
);
t.ok(
  'an unknown flag is refused',
  (await refuse(['build', '--nope'])).includes('Unknown flag --nope'),
);

await browser.close();
remote.close();

process.exit(t.done());
