// Slidev's global context in a slide's markup ($page, $clicks, $nav, $frontmatter, $slidev): fields of SlideBase.
export async function run({ t, open, press }) {
  const page = await open('/4');
  const text = await page.locator('#globals').innerText();
  t.ok(
    'globals: $page, $nav, $slidev.configs, $frontmatter and $renderContext are read in the markup',
    text === 'page 4 of 4, Setup deck, center, shown 4 center, slide',
    text,
  );
  t.ok(
    'globals: $clicks() is 0 before the click',
    (await page.locator('#after-click').count()) === 0,
  );
  await press(page, 'ArrowRight');
  t.ok(
    'globals: @if ($clicks() > 0) shows after the click',
    (await page.locator('#after-click').innerText()) === 'clicked 1',
  );
  await page.locator('#globals-first').click();
  await page.waitForFunction(() => location.pathname === '/1');
  t.ok('globals: $nav.go(1) goes to the first slide', true);
  await page.close();
}
