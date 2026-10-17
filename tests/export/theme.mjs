// Themes end to end: a deck outside the repository (so it gets its own working copy of the app) uses examples/theme-minimal,
// is built with the real command line, and is opened in Chromium. Also `theme eject` of the built-in theme, and a missing theme.
// Part of `npm run test:export`.
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
import { launch, reporter } from '../e2e/browser.mjs';
import { serveDirectory } from '../../scripts/export/static-server.mjs';
import { consoleProblem } from '../console-problem.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const themeDir = resolve('examples/theme-minimal');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-theme-'));
const run = promisify(execFile);
const cli = async (args, cwd) =>
  (await run(process.execPath, [bin, ...args], { cwd, encoding: 'utf8' })).stdout;

// Only a deck that uses the example theme may use its component.
const slides = (head, themed) => `---
title: Theme deck
${head}---

# Hello theme

---
layout: quote
---

A quote that the theme draws.

---

# Callout

${themed ? '<minimal-callout title="Careful">The theme brings this component.</minimal-callout>' : ''}

<p id="muted" class="minimal-muted">muted by a UnoCSS shortcut</p>
`;
function deck(name, head, themed = false) {
  const dir = join(scratch, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'slides.md'), slides(head, themed));
  return dir;
}
async function build(dir) {
  const out = join(dir, 'site');
  await cli(['build', join(dir, 'slides.md'), '--out', out], dir);
  return out;
}

// ---- three decks: no theme, the example theme, and the ejected built-in theme
const plain = deck('plain', '');
const themed = deck('themed', `theme: ${themeDir}\n`, true);
const ejected = deck('ejected', '');
const [plainSite, themedSite] = [await build(plain), await build(themed)];
const ejectOut = await cli(['theme', 'eject'], ejected);
t.ok(
  'theme eject copies the built-in layouts and sets theme: ./theme',
  existsSync(join(ejected, 'theme/layouts/cover.ts')) &&
    /^theme: \.\/theme$/m.test(readFileSync(join(ejected, 'slides.md'), 'utf8')),
  ejectOut.trim(),
);
// A theme folder outside the deck (here given by its absolute path) is copied in like a package.
const shared = deck('shared', `theme: ${themeDir}\n`, true);
await cli(['theme', 'eject'], shared);
t.ok(
  'theme eject copies a theme folder from outside the deck',
  existsSync(join(shared, 'theme/layouts/cover.ts')) &&
    /^theme: \.\/theme$/m.test(readFileSync(join(shared, 'slides.md'), 'utf8')),
);
const ejectedFiles = readdirSync(join(ejected, 'theme/layouts')).map((f) =>
  readFileSync(join(ejected, 'theme/layouts', f), 'utf8'),
);
t.ok(
  'the ejected layouts never import with ../ (they would break outside src/app)',
  !ejectedFiles.some((f) => /from '\.\.\//.test(f)),
  `${ejectedFiles.length} files`,
);
const ejectedSite = await build(ejected);

async function look(site, path) {
  const served = await serveDirectory(site, '/');
  const browser = await launch();
  const page = await (
    await browser.newContext({ viewport: { width: 1280, height: 720 } })
  ).newPage();
  const problems = [];
  page.on('console', (m) => {
    const problem = consoleProblem(m);
    if (problem) problems.push(problem);
  });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${served.origin}${path}`);
  await page.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  return {
    page,
    problems,
    close: async () => {
      await browser.close();
      await served.close();
    },
  };
}

// ---- without a theme
let v = await look(plainSite, '/1');
t.ok('plain deck: the built-in cover layout', (await v.page.locator('sn-cover').count()) === 1);
t.ok(
  'plain deck: light mode',
  !(await v.page.evaluate(() => document.documentElement.classList.contains('dark'))),
);
await v.close();

// ---- with the example theme
v = await look(themedSite, '/1');
const { page } = v;
t.ok(
  'the theme replaces the cover layout',
  (await page.locator('minimal-cover').count()) === 1 &&
    (await page.locator('sn-cover').count()) === 0,
);
t.ok(
  'the theme CSS is applied',
  (await page
    .locator('.minimal-cover-line')
    .evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(245, 158, 11)',
);
t.ok(
  'the theme headmatter sets the colour schema (dark)',
  await page.evaluate(() => document.documentElement.classList.contains('dark')),
);
await page.keyboard.press('ArrowDown');
await page.waitForFunction(() => document.querySelector('#hud')?.innerText.startsWith('slide 2/'));
t.ok('the theme replaces the quote layout', (await page.locator('minimal-quote').count()) === 1);
await page.keyboard.press('ArrowDown');
await page.waitForFunction(() => document.querySelector('#hud')?.innerText.startsWith('slide 3/'));
t.ok(
  'a slide can use the component of the theme',
  (await page.locator('minimal-callout .minimal-callout-title').innerText()) === 'Careful',
);
t.ok(
  'the component is styled by the theme CSS',
  (await page.locator('minimal-callout').evaluate((e) => getComputedStyle(e).borderLeftColor)) ===
    'rgb(245, 158, 11)',
);
t.ok(
  'the UnoCSS shortcut of the theme works',
  Number(await page.locator('#muted').evaluate((e) => getComputedStyle(e).opacity)) === 0.6,
);
await page.keyboard.press('b');
await page.waitForFunction(() => document.querySelector('#hud')?.innerText.startsWith('slide 2/'));
t.ok(
  'the setup provider of the theme adds the b shortcut (back one slide)',
  (await page.locator('#hud').innerText()).startsWith('slide 2/'),
);
t.ok('no console errors in the themed deck', v.problems.length === 0, v.problems.join('|'));
await v.close();

// ---- the ejected theme draws the same layouts as the built-in one
v = await look(ejectedSite, '/1');
t.ok(
  'ejected built-in theme: the cover layout still renders',
  (await v.page.locator('sn-cover').count()) === 1,
);
t.ok('ejected built-in theme: no console errors', v.problems.length === 0, v.problems.join('|'));
await v.close();

// ---- --theme on the command line replaces the headmatter's theme
const flagged = deck('flagged', '');
await cli(
  ['build', join(flagged, 'slides.md'), '--theme', themeDir, '--out', join(flagged, 'site')],
  flagged,
);
const flaggedJs = readdirSync(join(flagged, 'site'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(flagged, 'site', f), 'utf8'))
  .join('\n');
t.ok(
  '--theme <path> uses that theme although the headmatter names none',
  flaggedJs.includes('minimal-cover') &&
    !readFileSync(join(flagged, 'slides.md'), 'utf8').includes('theme:'),
);

// ---- a theme by name from node_modules: a copy of the example theme stands in for the package @slide-ng/theme-demo
// (the way the official themes of the slide.ng-themes repository are found), and its eject
const named = deck('named', 'theme: demo\n', true);
cpSync(themeDir, join(named, 'node_modules/@slide-ng/theme-demo'), { recursive: true });
const namedSite = await build(named);
const namedJs = readdirSync(namedSite)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(join(namedSite, f), 'utf8'))
  .join('\n');
t.ok(
  'theme: demo is found as @slide-ng/theme-demo in node_modules and its layouts and component are built',
  namedJs.includes('minimal-cover') && namedJs.includes('minimal-callout'),
);
const namedEject = await cli(['theme', 'eject'], named);
t.ok(
  'theme eject of a package name copies the package folder',
  existsSync(join(named, 'theme/layouts/cover.ts')) &&
    existsSync(join(named, 'theme/theme.json')) &&
    /^theme: \.\/theme$/m.test(readFileSync(join(named, 'slides.md'), 'utf8')),
  namedEject.trim(),
);

// ---- a theme that does not exist
const missing = deck('missing', 'theme: ./nope\n');
const failure = await cli(
  ['build', join(missing, 'slides.md'), '--out', join(missing, 'site')],
  missing,
).then(
  () => '',
  (e) => e.stderr,
);
t.ok(
  'a theme path that is not a folder fails with a message',
  /is not a folder/.test(failure),
  failure.trim(),
);
const unknown = deck('unknown', 'theme: ocean\n');
const official = deck('official', 'theme: seriph\n');
const officialFailure = await cli(
  ['build', join(official, 'slides.md'), '--out', join(official, 'site')],
  official,
).then(
  () => '',
  (e) => e.stderr,
);
t.ok(
  'an official theme name that is not installed names the scoped package',
  /Install it with: npm install -D @slide-ng\/theme-seriph/.test(officialFailure),
  officialFailure.trim().slice(-200),
);
const warned = await run(
  process.execPath,
  [bin, 'build', join(unknown, 'slides.md'), '--out', join(unknown, 'site')],
  { cwd: unknown, encoding: 'utf8' },
).then(
  (r) => ({ ...r, status: 0 }),
  (e) => ({ stdout: e.stdout, stderr: e.stderr, status: e.code }),
);
const unknownOutput = warned.stdout + warned.stderr;
t.ok(
  'an uninstalled theme package stops the build with the install command',
  warned.status !== 0 &&
    /The theme "ocean" was not found\. Install it with: npm install -D slide-ng-theme-ocean/.test(
      unknownOutput,
    ) &&
    !existsSync(join(unknown, 'site/index.html')),
  unknownOutput.trim().slice(-300),
);
process.exit(t.done());
