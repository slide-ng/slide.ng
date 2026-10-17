// `npm run test:e2e`: builds the app, serves dist/ and checks it in a real browser.
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { launch, reporter, serve } from './browser.mjs';
import { consoleProblem } from '../console-problem.mjs';

if (!process.env.SKIP_BUILD) execSync('npm run build', { stdio: 'inherit' });
const { server, port } = await serve('dist/slide-ng/browser');
const base = `http://localhost:${port}`;
const browser = await launch();
const t = reporter();
const problems = []; // console errors and warnings, must stay empty

// Open a URL and wait until the deck has drawn its clicks readout.
async function open(url, size = { width: 1280, height: 720 }) {
  const page = await browser.newPage({ viewport: size });
  page.on('console', (m) => {
    const problem = consoleProblem(m);
    if (problem) problems.push(problem);
  });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(base + url);
  await page.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.waitForTimeout(150);
  return page;
}
const press = async (page, key) => {
  await page.keyboard.press(key);
  await page.waitForTimeout(200);
};
const hud = async (page) => (await page.locator('#hud').innerText()).trim();
const path_ = (page) => new URL(page.url()).pathname;
const clicksParam = (page) => new URL(page.url()).searchParams.get('clicks');
// Ids (comma separated) of the elements that are currently visible.
const visibleIds = (page, ids) =>
  page.evaluate(
    (ids) =>
      ids.filter((i) => getComputedStyle(document.getElementById(i)).opacity !== '0').join(','),
    ids,
  );
// 1 or 0 for each <li>: visible or not.
const visibleItems = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('li')]
      .map((e) => (getComputedStyle(e).opacity !== '0' ? 1 : 0))
      .join(''),
  );

// ---- navigation and Angular syntax --------------------------------------------------
let page = await open('/');
t.ok('/ redirects to /1', path_(page) === '/1', path_(page));
t.ok(
  'hud on slide 1 (10 slides, hidden one skipped)',
  (await hud(page)) === 'slide 1/10 clicks 0/0',
  await hud(page),
);
t.ok(
  'document title from frontmatter',
  (await page.title()) === 'slide.ng starter deck',
  await page.title(),
);
t.ok('slide 1 uses cover layout', (await page.locator('sn-cover').count()) === 1);
await press(page, 'ArrowRight');
t.ok('ArrowRight goes to slide 2', path_(page) === '/2' && clicksParam(page) === '0', path_(page));
t.ok('interpolation {{ c.n() }}', (await page.locator('p').first().innerText()) === 'Count is 5.');
t.ok('@if false at start', (await page.locator('#big').count()) === 0);
await page.locator('#ctr').click();
await page.waitForTimeout(100);
t.ok(
  'counter click updates interpolation',
  (await page.locator('p').first().innerText()) === 'Count is 6.',
);
t.ok('@if true after click', (await page.locator('#big').count()) === 1);
await press(page, 'ArrowRight');
t.ok(
  'slide 3 code block text is literal',
  (await page.locator('pre code').innerText()) === 'const o = { a: 1 }; // @Component {{ x }}',
);
t.ok(
  'slide 3 inline code is literal',
  (await page.locator('p code').allInnerTexts()).join('|') === '{{ x }}|@if',
);

// ---- layouts --------------------------------------------------------------------------
await press(page, 'ArrowRight');
const mid = await page.locator('h1').evaluate((e) => {
  const b = e.getBoundingClientRect();
  return [b.x + b.width / 2, b.y + b.height / 2];
});
t.ok(
  'slide 4 center layout puts the content in the middle',
  (await page.locator('sn-center').count()) === 1 && Math.abs(mid[1] - 360) < 80,
  mid.join(),
);
await press(page, 'ArrowRight');
const left = await page.locator('h1', { hasText: 'Left' }).boundingBox();
const right = await page.locator('h1', { hasText: 'Right' }).boundingBox();
t.ok(
  'slide 5 two-cols puts ::right:: content in second column',
  right.x > left.x + 300 && Math.abs(right.y - left.y) < 2,
  `${left.x}/${right.x}`,
);
await press(page, 'ArrowRight');
const cls = await page
  .locator('sn-default')
  .evaluate((e) => [e.classList.contains('text-center'), getComputedStyle(e).textAlign]);
t.ok('slide 6 frontmatter class reaches the layout', cls[0] && cls[1] === 'center', cls.join());
t.ok(
  'slide 6 title in document title',
  (await page.title()) === 'Custom class - slide.ng starter deck',
  await page.title(),
);

// ---- click variants (slide 7) -------------------------------------------------------
await press(page, 'ArrowRight');
t.ok('slide 7 has 4 clicks', (await hud(page)) === 'slide 7/10 clicks 0/4', await hud(page));
const expected = ['h', 'a,h', 'a,b,af', 'a,b,r,af', 'a,b,af']; // range [3,4] is only visible at click 3
for (let n = 0; n <= 4; n++) {
  if (n) await press(page, 'ArrowRight');
  const got = await visibleIds(page, ['a', 'b', 'r', 'h', 'af']);
  t.ok(
    `slide 7 click ${n} shows [${expected[n]}]`,
    got === expected[n] && clicksParam(page) === String(n),
    `got [${got}] ?clicks=${clicksParam(page)}`,
  );
}
await press(page, 'ArrowRight');
t.ok(
  'end of clicks goes to slide 8 at click 0',
  path_(page) === '/8' && (await hud(page)) === 'slide 8/10 clicks 0/3',
  path_(page) + ' ' + (await hud(page)),
);
for (const [n, items] of [
  [0, '000'],
  [1, '100'],
  [2, '110'],
  [3, '111'],
]) {
  if (n) await press(page, 'ArrowRight');
  t.ok(
    `slide-ng-clicks click ${n} shows items ${items}`,
    (await visibleItems(page)) === items,
    await visibleItems(page),
  );
}
for (let n = 0; n < 3; n++) await press(page, 'ArrowLeft');
t.ok(
  'ArrowLeft x3 returns to click 0',
  (await visibleItems(page)) === '000' && clicksParam(page) === '0',
);
await press(page, 'ArrowLeft');
t.ok(
  'ArrowLeft at click 0 goes to slide 7 at its last click',
  path_(page) === '/7' &&
    clicksParam(page) === '4' &&
    (await visibleIds(page, ['a', 'b', 'r', 'h', 'af'])) === 'a,b,af',
  path_(page) + '?' + clicksParam(page),
);

// ---- hidden slide, canvas -----------------------------------------------------------
const titles = [];
for (let n = 1; n <= 10; n++) {
  await page.goto(`${base}/${n}`);
  await page.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  titles.push(await page.locator('h1').first().innerText());
}
t.ok(
  'hidden slide is not in the deck',
  !titles.includes('Hidden slide') && titles.length === 10,
  titles.join(' | '),
);
await page.close();

const wide = await open('/2', { width: 1920, height: 1080 });
const box = await wide.locator('.canvas').boundingBox();
// The canvas is 980x552 (height rounded up, as Slidev), so in a 16:9 window it is 0.2% narrower than the window.
t.ok(
  'canvas scales to 1920x1080 window',
  Math.abs(box.width - 1920) < 4 && Math.abs(box.height - 1080) < 2,
  `${box.width}x${box.height}`,
);
await wide.close();
const square = await open('/2', { width: 800, height: 800 });
const sbox = await square.locator('.canvas').boundingBox();
t.ok(
  'canvas keeps 16:9 and fits an 800x800 window',
  Math.abs(sbox.width - 800) < 2 && Math.abs(sbox.height - 450) < 2 && Math.abs(sbox.y - 175) < 2,
  `${sbox.width}x${sbox.height} at y=${sbox.y}`,
);
await square.close();

// ---- deep links -----------------------------------------------------------------------
for (const [url, p, c, ids] of [
  ['/7?clicks=2', '/7', '2', 'a,b,af'],
  ['/7?clicks=99', '/7', '4', 'a,b,af'],
  ['/7', '/7', '0', 'h'],
]) {
  page = await open(url);
  t.ok(
    `deep link ${url}`,
    path_(page) === p &&
      clicksParam(page) === c &&
      (await visibleIds(page, ['a', 'b', 'r', 'h', 'af'])) === ids,
    `${path_(page)}?${clicksParam(page)}`,
  );
  await page.close();
}
page = await open('/8?clicks=2');
t.ok(
  'deep link /8?clicks=2 shows two items',
  (await visibleItems(page)) === '110' && clicksParam(page) === '2',
);
await page.close();
page = await open('/10?clicks=1');
t.ok(
  'last slide at its last click',
  (await hud(page)) === 'slide 10/10 clicks 1/1',
  await hud(page),
);
await press(page, 'ArrowRight');
t.ok('ArrowRight on the last slide stays', path_(page) === '/10' && clicksParam(page) === '1');
await page.close();
page = await open('/99');
t.ok('/99 clamps to the last slide', (await hud(page)).startsWith('slide 10/10'), await hud(page));
await page.close();

// ---- the starter deck uses no heavy feature, so none of them is in the output ---------------
const dist = 'dist/slide-ng/browser';
const text = readdirSync(dist)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => readFileSync(`${dist}/${f}`, 'utf8'))
  .join('\n');
for (const [name, marker] of [
  ['Monaco', 'MonacoEnvironment'],
  ['Mermaid', 'mermaidAPI'],
  ['KaTeX', '.katex{'],
  ['Magic Move', 'shiki-magic-move-container{'],
  ['rough-notation', 'rough-notation-dash'],
]) {
  t.ok(`the starter build does not contain ${name}`, !text.includes(marker));
}
t.ok(
  'no worker files in the starter build',
  !readdirSync(dist).some((f) => f.startsWith('worker-')),
);

t.ok('no console errors or warnings', problems.length === 0, JSON.stringify(problems));
await browser.close();
server.close();
process.exit(t.done());
