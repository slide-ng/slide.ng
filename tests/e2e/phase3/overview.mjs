// The pages /overview (every slide with a clicks slider and its notes) and /entry (links), and the way there from the
// quick overview. Editing notes needs the dev server and is checked in tests/e2e/dev-server.mjs.
export async function run({ t, base, browser, problems, open, press }) {
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
  await page.waitForTimeout(200);
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

  const deck = await open('/1');
  await press(deck, 'o');
  await deck.locator('#overview-page-link').click();
  await deck.waitForFunction(() => location.pathname === '/overview');
  t.ok('the quick overview links to /overview', true);
  await deck.close();
}
