// Magic move: steps and line ranges follow the clicks, the lazy chunks load only here.
export async function run({ t, open, press, hud }) {
  const page = await open('/7');
  await page.waitForSelector('.shiki-magic-move-container .shiki-magic-move-item');
  const text = () =>
    page
      .locator('.shiki-magic-move-container')
      .evaluate((e) => e.innerText.replace(/\s+/g, ' ').trim());
  const lit = () =>
    page.evaluate(() => {
      // which lines (split at <br>) have a highlighted token
      const kids = [...document.querySelector('.shiki-magic-move-container').children].slice(1);
      const lines = [[]];
      kids.forEach((k) => (k.tagName === 'BR' ? lines.push([]) : lines.at(-1).push(k)));
      return lines
        .filter((l) => l.length)
        .map((l) => (l.every((k) => k.classList.contains('highlighted')) ? 1 : 0))
        .join('');
    });
  t.ok(
    'magic move: 3 clicks for the steps plus one for the element after it',
    /^slide 7\/\d+ clicks 0\/4$/.test(await hud(page)),
    await hud(page),
  );
  t.ok(
    'step 1 is shown first',
    (await text()).startsWith('let count = 1 function add() {'),
    await text(),
  );
  t.ok('all lines highlighted at the start ({*})', (await lit()) === '1111', await lit());
  await press(page, 'ArrowRight', 400);
  t.ok('click 1 highlights line 1 of step 1', (await lit()) === '1000', await lit());
  await press(page, 'ArrowRight', 400);
  t.ok('click 2 highlights lines 2-3', (await lit()) === '0110', await lit());
  await press(page, 'ArrowRight', 1500);
  t.ok(
    'click 3 morphs to step 2',
    (await text()).includes('const add = () => count += 1'),
    await text(),
  );
  const cssVar = (name) =>
    page
      .locator('.shiki-magic-move-container')
      .evaluate((e, n) => e.style.getPropertyValue(n), name);
  t.ok(
    'shiki.magicMove options reach the renderer (easing, delayMove)',
    (await cssVar('--smm-easing')) === 'linear' && (await cssVar('--smm-delay-move')) === '0.5',
    `${await cssVar('--smm-easing')} ${await cssVar('--smm-delay-move')}`,
  );
  t.ok(
    'step 2 has line numbers from its {lines:true}',
    (await page.locator('.shiki-magic-move-line-number').count()) > 0 ||
      (await text()).startsWith('1 '),
  );
  t.ok(
    'screen readers skip the line numbers',
    await page
      .locator('.shiki-magic-move-line-number')
      .evaluateAll((l) => l.length > 0 && l.every((e) => e.getAttribute('aria-hidden') === 'true')),
  );
  const hidden = () =>
    page.locator('#after-magic').evaluate((e) => e.classList.contains('slidev-vclick-hidden'));
  t.ok('the element after the block still waits', await hidden());
  await press(page, 'ArrowRight');
  t.ok('click 4 shows it', !(await hidden()));
  await press(page, 'ArrowLeft', 1500);
  await press(page, 'ArrowLeft', 1500);
  t.ok(
    'going back returns to step 1',
    (await text()).startsWith('let count = 1 function add()'),
    await text(),
  );
  await page.close();
}
