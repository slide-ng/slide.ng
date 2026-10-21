// The pages /overview (every slide with a clicks slider and its notes) and /entry (links), and the way there from the
// quick overview. Editing notes needs the dev server and is checked in tests/e2e/dev-server.mjs.
export async function run({ t, base, browser, problems, open, press, until }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${base}/overview`);
  await page.locator('.overview-row').first().waitFor({ timeout: 15000 });
  t.ok('/overview lists every slide', (await page.locator('.overview-row').count()) === 4);
  const row = page.locator('.overview-row[data-no="2"]');
  t.ok(
    '/overview shows the notes beside the slide',
    (await row.locator('.slidev-note').innerText()).includes('Before the clicks.'),
  );
  await row.locator('app-thumbnail').waitFor({ timeout: 10000 });
  t.ok(
    '/overview draws a slide at its last click first',
    !(await row.locator('#c2').evaluate((e) => e.classList.contains('slidev-vclick-hidden'))),
  );
  await row.locator('.clicks-cell', { hasText: '1' }).click();
  await until(page, () =>
    document
      .querySelector('.overview-row[data-no="2"] #c2')
      ?.classList.contains('slidev-vclick-hidden'),
  );
  t.ok(
    '/overview: the clicks slider sets the click of the thumbnail',
    !(await row.locator('#c1').evaluate((e) => e.classList.contains('slidev-vclick-hidden'))) &&
      (await row.locator('#c2').evaluate((e) => e.classList.contains('slidev-vclick-hidden'))),
  );
  t.ok(
    '/overview: the notes follow the chosen click',
    (await row.locator('.slidev-note-click-mark-active').count()) === 1,
  );
  t.ok(
    '/overview: a slide without clicks has no slider',
    (await page.locator('.overview-row[data-no="3"] app-clicks-slider').count()) === 0,
  );
  await row.locator('.overview-note').dblclick();
  t.ok(
    '/overview: notes cannot be edited without the dev server',
    (await page.locator('.overview-note-edit').count()) === 0,
  );

  for (const width of [320, 375]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(`${base}/overview`);
    const note = page.locator('.overview-row[data-no="2"] .overview-note');
    await note.waitFor({ timeout: 15000 });
    const box = await note.boundingBox();
    t.ok(
      `/overview at ${width}px: the notes are below the slide, as wide as the page`,
      box.width > width - 80 &&
        (await page.evaluate(() => document.querySelector('app-overview-page').scrollWidth)) <=
          width,
      JSON.stringify(box),
    );
  }

  await page.goto(`${base}/entry`);
  const labels = (await page.locator('#entry a').allInnerTexts()).map((l) => l.trim());
  t.ok(
    '/entry links to the slides, presenter, notes and overview',
    labels.join('|') === 'Slides|Presenter|Notes|Overview',
    labels.join('|'),
  );
  await page.locator('#entry a', { hasText: 'Overview' }).click();
  await page.waitForFunction(() => location.pathname === '/overview');
  t.ok('/entry: a link opens its page', true);
  await page.goto(`${base}/notes-edit`);
  await page.waitForFunction(() => location.pathname === '/1');
  t.ok('/notes-edit is only there while developing', true);
  await page.close();

  // Landmarks and headings: each page has one main landmark and a level-one heading (visually hidden where the page
  // shows none); on the audience page the slide is inside the main landmark.
  const landmarks = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  for (const [path, ready] of [
    ['/overview', '.overview-row'],
    ['/notes', '#notes-scroller'],
    ['/presenter/1', '#hud'],
    ['/1', '#hud'],
  ]) {
    await landmarks.goto(`${base}${path}`);
    await landmarks.locator(ready).first().waitFor({ timeout: 15000 });
    const found = await landmarks.evaluate(() => ({
      main: document.querySelectorAll('main, [role="main"]').length,
      h1: document.querySelectorAll('h1').length > 0,
      slideInMain:
        !document.querySelector('#slide-content') ||
        !!document.querySelector('#slide-content').closest('main, [role="main"]'),
    }));
    t.ok(
      `${path} has one main landmark and a level-one heading, with the slide inside it`,
      found.main === 1 && found.h1 && found.slideInMain,
      JSON.stringify(found),
    );
  }
  await landmarks.close();

  const deck = await open('/1');
  await press(deck, 'o');
  t.ok(
    'quick overview: a card is named with the slide title',
    (await deck.locator('.overview-card[data-no="2"]').getAttribute('aria-label')) ===
      'Go to slide 2: Clicks and notes',
  );
  await press(deck, 'ArrowRight');
  t.ok(
    'quick overview: the arrow keys move the focus with the highlight',
    await deck.evaluate(() => document.activeElement?.getAttribute('data-no') === '2'),
    await deck.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)),
  );
  await deck.locator('#overview-page-link').click();
  await deck.waitForFunction(() => location.pathname === '/overview');
  t.ok('the quick overview links to /overview', true);
  await deck.close();
}
