// A normal build (`pwa: true`, served over HTTP) with the network switched off: windows still follow each other, the deck
// reloads from the service worker's store, and pictures and fonts come from the build, not from their servers.
// It also shows the limit: a browser that has never opened the deck cannot get it with no network. Part of `npm run test:export`.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch, reporter } from '../e2e/browser.mjs';
import { serveDirectory } from '../../scripts/export/static-server.mjs';
import { fontProvider, remotePictures } from './offline-fixtures.mjs';
import { consoleProblem } from '../console-problem.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-offline-net-'));
const env = {
  ...process.env,
  CHROME_PATH: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  // The tests run as root in containers, where Chromium cannot use its sandbox.
  SLIDE_NG_NO_SANDBOX: '1',
  // The "remote" servers of this test are on 127.0.0.1, which downloads refuse unless a test says so.
  SLIDE_NG_ALLOW_LOCAL_FETCH: '1',
};
const run = promisify(execFile);

const pictures = await remotePictures();
const fonts = await fontProvider('NetTest');
const deckDir = join(scratch, 'deck');
mkdirSync(deckDir, { recursive: true });
writeFileSync(
  join(deckDir, 'slides.md'),
  `---
title: Network test
pwa: true
remoteAssets: true
fonts:
  sans: NetTest
  provider: ${fonts.cssUrl}
  allowCustomProvider: true
---

# One

<div slide-ng-click>a click</div>

<img id="remote" src="${pictures.origin}/pic.png" width="40">

---

# Two

<!--
The note of slide two.
-->

---

# Three
`,
);
const site = join(scratch, 'site');
await run(process.execPath, [bin, 'build', join(deckDir, 'slides.md'), '--out', site], {
  cwd: deckDir,
  env,
  maxBuffer: 1 << 26,
});
t.ok(
  'pwa implies self-hosted fonts: the provider was asked once for the sheet and once for the file',
  fonts.asked.css === 1 && fonts.asked.files === 1,
  JSON.stringify(fonts.asked),
);
const worker = readFileSync(join(site, 'sw.js'), 'utf8');
t.ok(
  'the offline list holds the font file and the picture',
  /media\/[\w-]+\.woff2/.test(worker) && worker.includes('remote-assets/'),
);
await pictures.stop();
await fonts.stop(); // no internet from here on, apart from the deck's own server

const served = await serveDirectory(site, '/');
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const problems = [];
const watch = (page) => {
  page.on('console', (m) => {
    const problem = consoleProblem(m);
    if (problem) problems.push(problem.slice(0, 300));
  });
  page.on('pageerror', (e) => problems.push(String(e).slice(0, 200)));
};
const ready = (page) =>
  page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 20000 },
  );
const hud = async (page) => (await page.locator('#hud').innerText()).trim();
const open = async (path) => {
  const p = await context.newPage();
  watch(p);
  await p.goto(served.origin + path);
  await ready(p);
  return p;
};

const viewer = await open('/1');
t.ok(
  'the deck loads with the provider and the picture server stopped: font and picture come from the build',
  await viewer.evaluate(async () => {
    await document.fonts.load('16px NetTest');
    const img = document.querySelector('#remote');
    return (
      document.fonts.check('16px NetTest') &&
      getComputedStyle(document.body).fontFamily.startsWith('NetTest') &&
      img.naturalWidth === 1 &&
      /^remote-assets\//.test(img.getAttribute('src'))
    );
  }),
);
const presenter = await open('/presenter/1');
await viewer.waitForFunction(
  () => navigator.serviceWorker.getRegistration().then((r) => r?.active),
  null,
  { timeout: 20000 },
);

// ---- 2. the network is off after loading
await context.setOffline(true);
t.ok(
  'the page really is offline now',
  await viewer.evaluate(() =>
    fetch('/sw.js', { cache: 'no-store' }).then(
      () => false,
      () => true,
    ),
  ),
);
problems.length = 0; // that request failed on purpose, and the browser logs it
await presenter.bringToFront();
await presenter.keyboard.press('ArrowRight');
await presenter.waitForTimeout(400);
await presenter.keyboard.press('ArrowRight');
await presenter.waitForTimeout(900);
t.ok(
  'offline: the presenter moves and the audience window follows',
  (await hud(presenter)).startsWith('slide 2/3') && (await hud(viewer)).startsWith('slide 2/3'),
  `${await hud(presenter)} | ${await hud(viewer)}`,
);
t.ok(
  'offline: the presenter page shows the note of that slide',
  (await presenter.locator('body').innerText()).includes('The note of slide two.'),
);
await viewer.bringToFront();
await viewer.keyboard.press('ArrowRight');
await viewer.waitForTimeout(900);
t.ok(
  'offline: a move in the audience window reaches the presenter',
  (await hud(presenter)).startsWith('slide 3/3'),
  await hud(presenter),
);
await viewer.keyboard.press('ArrowLeft');
await viewer.waitForTimeout(900);
t.ok(
  'offline: and going back is followed too',
  (await hud(presenter)).startsWith('slide 2/3') &&
    (await presenter.locator('body').innerText()).includes('The note of slide two.'),
  await hud(presenter),
);
t.ok(
  'the offline badge says Offline',
  (await viewer.locator('#offline-badge').innerText()) === 'Offline',
);

// ---- 3. the server is gone as well: a reload is answered by the service worker
await viewer.reload();
await viewer.waitForFunction(() => navigator.serviceWorker.controller); // now the worker controls the page
await context.setOffline(false);
await served.close();
await context.setOffline(true);
await viewer.goto(served.origin + '/2').catch(() => {});
await ready(viewer).then(
  async () =>
    t.ok(
      'with the network and the server gone the deck opens from the store, at slide 2, with its font',
      (await hud(viewer)).startsWith('slide 2/3') &&
        (await viewer.evaluate(async () => {
          await document.fonts.load('16px NetTest');
          return document.fonts.check('16px NetTest');
        })),
    ),
  () =>
    t.ok(
      'with the network and the server gone the deck opens from the store, at slide 2, with its font',
      false,
      'did not load',
    ),
);
t.ok(
  'no console errors or warnings in the pages that were open while the network was on and off',
  problems.length === 0,
  JSON.stringify(problems.slice(0, 5)),
);

// ---- 4. the limit: a browser that has never opened the deck has nothing in its store
const fresh = await browser.newContext({ viewport: { width: 1280, height: 720 }, offline: true });
const blank = await fresh.newPage();
const failure = await blank.goto(served.origin + '/1', { timeout: 10000 }).then(
  () => '',
  (e) => String(e.message).split('\n')[0],
);
t.ok(
  'first visit with no network fails: the deck is not there (the service worker only stores it after one online visit)',
  /ERR_|net::/.test(failure),
  failure,
);
t.ok(
  'the build folder has everything to carry (no hidden dependency on the network): no http address in any style sheet',
  readdirSync(site)
    .filter((f) => f.endsWith('.css'))
    .every((f) => !/https?:\/\/(?!www\.w3\.org)/.test(readFileSync(join(site, f), 'utf8'))),
);

await browser.close();
process.exit(t.done());
