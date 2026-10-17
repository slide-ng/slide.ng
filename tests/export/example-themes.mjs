// The example themes paper, moss and blueprint, end to end: for each, a deck outside the repository is built with the real
// command line and opened in Chromium; the theme's cover, section and component must render in the theme's colours.
// Part of `npm run test:export`.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { launch, reporter } from '../e2e/browser.mjs';
import { serveDirectory } from '../../scripts/export/static-server.mjs';
import { consoleProblem } from '../console-problem.mjs';

const t = reporter();
const bin = resolve('bin/slide-ng.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'slide-ng-example-themes-'));
const run = promisify(execFile);

// name, the component markup, the colour of the slide background, the dark mode the theme sets
const themes = [
  [
    'paper',
    '<paper-pull by="A. Reader">Set in the serif.</paper-pull>',
    'rgb(244, 239, 230)',
    false,
  ],
  ['moss', '<moss-stat value="42%" label="of the forest"></moss-stat>', 'rgb(19, 26, 21)', true],
  ['blueprint', '<bp-note label="A">Load balancer</bp-note>', 'rgb(15, 44, 76)', true],
];
const component = { paper: 'paper-pull', moss: 'moss-stat', blueprint: 'bp-note' };
const cover = { paper: 'paper-cover', moss: 'moss-cover', blueprint: 'bp-cover' };
const section = { paper: 'paper-section', moss: 'moss-section', blueprint: 'bp-section' };

for (const [name, markup, background, dark] of themes) {
  const dir = join(scratch, name);
  mkdirSync(join(dir, 'public'), { recursive: true });
  // a 1x1 picture for the cover's background
  writeFileSync(
    join(dir, 'public', 'bg.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    ),
  );
  // provider none: no network in the test
  writeFileSync(
    join(dir, 'slides.md'),
    `---
title: ${name} deck
theme: ${resolve(`examples/theme-${name}`)}
fonts:
  provider: none
background: /bg.png
issue: Issue 7
sheet: SHEET 42
---

# The ${name} theme

A subtitle

---
layout: section
no: '02'
---

# Part one

---

# Component

${markup}

- one
- two
`,
  );
  const site = join(dir, 'site');
  await run(process.execPath, [bin, 'build', join(dir, 'slides.md'), '--out', site], { cwd: dir });

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
  const open = async (no) => {
    await page.goto(`${served.origin}/${no}`);
    await page.waitForFunction(() =>
      /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    );
  };

  await open(1);
  t.ok(`${name}: the theme's cover layout`, (await page.locator(cover[name]).count()) === 1);
  t.ok(
    `${name}: colorSchema from theme.json`,
    (await page.evaluate(() => document.documentElement.classList.contains('dark'))) === dark,
  );
  const image = await page
    .locator(cover[name])
    .evaluate((e) => getComputedStyle(e).backgroundImage);
  t.ok(`${name}: the cover shows a background picture`, image.includes('bg.png'), image);
  const coverText = await page.locator(cover[name]).innerText();
  if (name === 'paper')
    t.ok('paper: issue reaches the masthead', coverText.toLowerCase().includes('issue 7'));
  if (name === 'blueprint') t.ok('blueprint: the sheet label', coverText.includes('SHEET 42'));
  await open(2);
  t.ok(`${name}: the theme's section layout`, (await page.locator(section[name]).count()) === 1);
  if (name === 'paper')
    t.ok('paper: the chapter mark', (await page.locator('.paper-section-no').innerText()) === '02');
  await open(3);
  t.ok(`${name}: the theme's component`, (await page.locator(component[name]).count()) === 1);
  const bg = await page
    .locator('.slidev-layout')
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  t.ok(`${name}: the slide background`, bg === background, bg);
  t.ok(`${name}: no console errors`, problems.length === 0, problems.join('|'));
  await browser.close();
  await served.close();
}

process.exit(t.done());
