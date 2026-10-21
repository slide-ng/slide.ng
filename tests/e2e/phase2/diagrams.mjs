// Mermaid (drawn in the browser, lazily) and PlantUML (an <img> from a server).
export async function run({ t, open, press }) {
  // The fake PlantUML server answers after 700 ms, so the page can be looked at while it waits.
  const slow = (page) =>
    page.route('**/plantuml/svg/**', async (route) => {
      await new Promise((r) => setTimeout(r, 700));
      await route.continue();
    });
  const page = await open('/9', undefined, slow);
  t.ok(
    'while the picture is pending the waitfor marker names what will exist',
    (await page.locator('slide-ng-plant-uml').getAttribute('data-slide-ng-waitfor')) === 'img',
  );
  await page.waitForFunction(() => document.querySelectorAll('.mermaid > svg').length === 2);
  t.ok(
    'mermaid fence and <slide-ng-mermaid code="..."> both become an SVG',
    (await page.locator('#direct .mermaid > svg').count()) === 1,
  );
  t.ok(
    'the diagram has its labels (the {{ }} hexagon survived)',
    (await page.locator('.mermaid').first().innerText()).includes('Result 2'),
  );
  t.ok(
    'the mermaid marker is cleared once the SVG is there',
    (await page.locator('slide-ng-mermaid[data-slide-ng-waitfor]').count()) === 0,
  );
  await page.waitForFunction(
    () => document.querySelectorAll('[data-slide-ng-waitfor]').length === 0,
  );
  t.ok(
    'every waitfor marker clears when the slide is ready',
    (await page.locator('[data-slide-ng-waitfor]').count()) === 0,
  );

  const first = page.locator('.mermaid > svg').first();
  const viewBoxHeight = +(await first.getAttribute('viewBox')).split(' ')[3];
  t.ok(
    'scale:0.8 sets the svg height to 0.8 x the viewBox height',
    Math.abs(+(await first.getAttribute('height')) - 0.8 * viewBoxHeight) < 0.01,
  );
  const box = await first.boundingBox();
  t.ok(
    'scale:0.8 keeps the diagram drawn at its size (the input is not read as a utility)',
    box.width > 100 &&
      (await page
        .locator('slide-ng-mermaid')
        .first()
        .evaluate((e) => getComputedStyle(e).transform)) === 'none',
    JSON.stringify(box),
  );
  const src = await page.locator('slide-ng-plant-uml img').getAttribute('src');
  t.ok(
    'plantuml is an <img> at the server with the encoded diagram',
    /^\/plantuml\/svg\/[\w-]+$/.test(src),
    src,
  );

  const themed = await page.locator('.mermaid').first().innerHTML();
  const direct = page.locator('#direct .mermaid');
  const light = await direct.innerHTML();
  await press(page, 'd', 300);
  await page.waitForFunction(
    (before) =>
      document.querySelector('#direct .mermaid')?.innerHTML !== before &&
      !!document.querySelector('#direct .mermaid > svg'),
    light,
  );
  t.ok(
    'dark mode redraws a diagram that sets no theme of its own',
    (await direct.innerHTML()) !== light,
  );
  t.ok(
    'a diagram with a theme keeps it in dark mode',
    (await page.locator('.mermaid').first().innerHTML()) === themed,
  );
  await page.close();
}
