// onSlideEnter, onSlideLeave and isSlideActive (src/app/lib/slide-hooks.ts) in a real deck: phase5/components/hook-counter.ts.
export async function run({ t, open, press }) {
  const page = await open('/3');
  const root = (name) => page.evaluate((n) => document.documentElement.dataset[n], name);
  await press(page, 'ArrowRight', 300);
  const text = () => page.locator('#hook-counter').innerText();
  t.ok(
    'onSlideEnter: runs once the slide is shown',
    (await text()) === 'enters 1, leaves 0, active',
    await text(),
  );
  t.ok(
    'onSlideEnter: gets the new and the old slide number',
    (await root('hookLast')) === '3 -> 4',
  );
  await press(page, 'ArrowLeft', 300);
  t.ok(
    'onSlideLeave: runs when another slide is shown',
    (await root('hookLeaves')) === '1 (4 -> 3)',
    await root('hookLeaves'),
  );
  await press(page, 'ArrowRight', 300);
  t.ok(
    'onSlideEnter: counts every entry',
    (await text()) === 'enters 2, leaves 1, active',
    await text(),
  );
  await page.close();
}
