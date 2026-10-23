// Twoslash: TypeScript types worked out while generating, shown as popups by CSS only.
export async function run({ t, open, until }) {
  const page = await open('/12');
  t.ok(
    'a twoslash block has hover popups with real types',
    (await page.locator('.twoslash-hover').count()) >= 4,
  );
  const queries = page.locator('.twoslash-query-line');
  const persisted = await queries.locator('.twoslash-popup-code').allInnerTexts();
  t.ok(
    'the ^? query is shown without hovering, with the inferred type',
    persisted.length === 2 &&
      persisted[0].includes('count: number') &&
      persisted[1].includes('x: number'),
    persisted.join('|'),
  );
  t.ok(
    'each ^? query takes a line of its own instead of covering the code',
    (await queries.evaluateAll((l) => l.map((e) => e.getBoundingClientRect().height))).every(
      (h) => h > 10,
    ),
  );
  const hidden = page
    .locator('.twoslash-hover:not(.twoslash-query-persisted) .twoslash-popup-container')
    .first();
  t.ok(
    'other popups wait for the mouse',
    (await hidden.evaluate((e) => getComputedStyle(e).opacity)) === '0',
  );
  const target = page
    .locator('.twoslash-hover:not(.twoslash-query-persisted)')
    .filter({ hasText: 'Math' })
    .first();
  const box = await target.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const popup = target.locator('.twoslash-popup-container').first();
  // The popup fades in by CSS: wait for it to be fully shown instead of a fixed time.
  const shown = await until(
    page,
    (e) => getComputedStyle(e).opacity === '1',
    await popup.elementHandle(),
  );
  t.ok(
    'hovering shows a popup',
    shown && (await popup.innerText()).includes('Math'),
    await popup.evaluate((e) => getComputedStyle(e).opacity),
  );
  t.ok(
    'a block without twoslash is left alone',
    (await page.locator('.slidev-code-wrapper').nth(1).locator('.twoslash-hover').count()) === 0,
  );
  await page.close();
}
