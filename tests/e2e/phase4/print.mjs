// The /print page: every slide stacked, optional click steps, a range, dark mode, the paper size.
import { consoleProblem } from '../../console-problem.mjs';
export async function run({ t, base, browser, problems }) {
  // This page has no #hud, so it is opened and awaited here.
  async function printPage(query, scheme = 'light') {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
      colorScheme: scheme,
    });
    page.on('console', (m) => {
      const problem = consoleProblem(m);
      if (problem) problems.push(problem);
    });
    page.on('pageerror', (e) => problems.push(String(e)));
    await page.goto(`${base}/print${query}`);
    await page.waitForSelector('[data-slide-ng-print="ready"]', { timeout: 20000 });
    await page.waitForFunction(() => !document.querySelector('[data-slide-ng-waitfor]'), null, {
      timeout: 20000,
    });
    return page;
  }
  const ids = (page) =>
    page.locator('.print-slide-container').evaluateAll((l) => l.map((e) => e.id));

  let page = await printPage('');
  const all = await ids(page);
  t.ok(
    '/print draws one page per slide with ids <slide>-<click>',
    all.length === 8 && all[0] === '001-01',
    all.join(),
  );
  t.ok(
    'without ?print=clicks every slide is at its final click',
    all[1] === '002-04' || all[1] === '002-03',
    all[1],
  );
  t.ok(
    'every page carries its slide number',
    (await page.locator('[data-slide-ng-no="8"]').count()) === 1,
  );
  const size = await page.locator('.print-slide-container').first().boundingBox();
  t.ok(
    'a page has the canvas size (980x552)',
    size.width === 980 && size.height === 552,
    `${size.width}x${size.height}`,
  );
  t.ok(
    'all clicks are shown (nothing hidden)',
    (await page.locator('.slidev-vclick-hidden').count()) === 0,
  );
  t.ok(
    'slide-ng-render-when print shows its content, slide does not',
    (await page.locator('#only-print').count()) === 1 &&
      (await page.locator('#only-slide').count()) === 0,
  );
  t.ok(
    'no overview, bar or presenter UI in the page',
    (await page.locator('app-nav-bar, app-overview, app-goto, app-context-menu').count()) === 0,
  );
  t.ok('the mermaid drawing is there', (await page.locator('.mermaid > svg').count()) === 1);
  t.ok(
    'the magic move code is drawn',
    (await page.locator('.shiki-magic-move-container span').count()) > 0,
  );
  t.ok('the monaco editor exists', (await page.locator('.monaco-editor').count()) >= 1);
  t.ok(
    'the slide-ng-mark is drawn on paper',
    (await page.locator('svg.rough-annotation').count()) === 1,
  );
  const paper = await page.evaluate(() =>
    [...document.styleSheets]
      .flatMap((s) => [...s.cssRules])
      .concat([...document.querySelectorAll('style')].flatMap((e) => [...e.sheet.cssRules]))
      .filter((r) => r.constructor.name === 'CSSPageRule')
      .map((r) => r.style.getPropertyValue('size'))
      .join(),
  );
  t.ok('@page size comes from the canvas', paper.includes('980px 552px'), paper);
  t.ok('the page is not a deck page (no hud)', (await page.locator('#hud').count()) === 0);
  const motion = await page.evaluate(() => document.getAnimations().length);
  t.ok('no animation is running', motion === 0, String(motion));
  await page.close();

  page = await printPage('?print=clicks');
  const steps = await ids(page);
  t.ok(
    '?print=clicks makes one page for every click step',
    steps.length === 13,
    `${steps.length}: ${steps.join()}`,
  );
  t.ok(
    'the pages of a slide follow each other with growing clicks',
    steps.slice(1, 4).join() === '002-01,002-02,002-03',
    steps.slice(1, 4).join(),
  );
  t.ok(
    'a slide with clicksStart 1 begins at its start',
    steps.includes('005-02') && steps.includes('005-03') && !steps.includes('005-01'),
    steps.join(),
  );
  const visible = await page
    .locator('#c1')
    .evaluateAll((l) => l.map((e) => getComputedStyle(e).opacity));
  t.ok(
    'the first page of the clicks slide hides its click elements',
    visible.length === 3 && visible.join() === '0,1,1',
    visible.join(),
  );
  await page.close();

  page = await printPage('?range=2,4-5');
  const r = await ids(page);
  t.ok(
    '?range keeps only those slides',
    r.map((i) => +i.split('-')[0]).join() === '2,4,5',
    r.join(),
  );
  await page.close();

  page = await printPage('?print=true', 'dark');
  t.ok(
    'a dark colour scheme gives the dark class',
    await page.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  const bg = await page
    .locator('.print-slide-container')
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  t.ok('and a dark page background', bg !== 'rgb(255, 255, 255)', bg);
  await page.close();

  page = await printPage('?range=2');
  const light = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  t.ok('a light colour scheme gives no dark class', !light);
  await page.close();

  // Slidev's address of a print page: /3?print=true
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/3?print=clicks&range=3`);
  await page.waitForSelector('[data-slide-ng-print="ready"]');
  t.ok(
    '/<no>?print=true goes to /print and keeps the query',
    new URL(page.url()).pathname === '/print' && (await ids(page)).length === 1,
    page.url(),
  );
  await page.close();
}
