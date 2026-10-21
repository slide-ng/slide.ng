// Headmatter `themeConfig`: `primary` becomes --slidev-theme-primary (over the default of vars.css), and slides read the map.
const RED = 'rgb(192, 57, 43)'; // #c0392b

export async function run({ t, base, browser, problems, open, style }) {
  let page = await open('/4');
  t.ok(
    'themeConfig.primary recolours text-primary',
    (await style(page, '#tc-text', 'color')) === RED,
    await style(page, '#tc-text', 'color'),
  );
  const variable = await page
    .locator('#tc-text')
    .evaluate((e) => getComputedStyle(e).getPropertyValue('--slidev-theme-primary').trim());
  t.ok('themeConfig.primary is --slidev-theme-primary', variable === '#c0392b', variable);
  t.ok(
    "themeConfig: a slide reads a value as {{ themeConfig['label'] }}",
    (await page.locator('#tc-label').innerText()) === 'Plum',
  );
  t.ok(
    'themeConfig: a list stays a value of the map',
    (await page.locator('#tc-sizes').innerText()) === '1,2',
  );
  await page.close();

  // The same generated CSS is used by the print page (export). It has no #hud, so it is awaited here.
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${base}/print?range=4`);
  await page.waitForSelector('[data-slide-ng-print="ready"]', { timeout: 20000 });
  const printed = await page
    .locator('#tc-text')
    .first()
    .evaluate((e) => getComputedStyle(e).color);
  t.ok('themeConfig.primary applies on the print page', printed === RED, printed);
  await page.close();
}
