// Slidev's global context in a slide's markup ($page, $clicks, $nav, $frontmatter, $slidev): fields of SlideBase.
// The slide has `routeAlias: globals`: its number and the total are read from the page, not written here.
export async function run({ t, open, press, hud }) {
  const page = await open('/globals');
  const [, no, total] = (await hud(page)).match(/slide (\d+)\/(\d+)/);
  const text = await page.locator('#globals').innerText();
  t.ok(
    'globals: $page, $nav, $slidev.configs, $frontmatter and $renderContext are read in the markup',
    text === `page ${no} of ${total}, Setup deck, center, shown ${no} center, slide`,
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
