// slide-ng-mark (rough-notation) and slide-ng-motion.
export async function run({ t, open, press, hud }) {
  const page = await open('/15');
  const marks = () => page.locator('svg.rough-annotation:has(path)').count();
  const tr = (id) => page.locator(id).evaluate((e) => getComputedStyle(e).transform);
  const settle = () => page.waitForTimeout(800);

  t.ok(
    'marks and motion add clicks: the slide-ng-click range [5, 6] is the highest',
    (await hud(page)).endsWith('clicks 0/6'),
    await hud(page),
  );
  t.ok(
    'slide-ng-mark with true is drawn from the start, the others wait',
    (await marks()) === 1,
    String(await marks()),
  );
  await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'click 1 draws the circle, and the plain slide-ng-mark (+1 after an absolute click is click 1)',
    (await marks()) === 3,
  );
  t.ok(
    'the mark colour comes from the .red modifier',
    (await page
      .locator('#m1')
      .evaluate((e) =>
        (e.nextElementSibling ?? e.previousElementSibling)
          .querySelector('path')
          .getAttribute('stroke'),
      )) === '#ef4444',
  );
  await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'click 2 draws the box with the colour from the object',
    (await marks()) === 4 &&
      (await page
        .locator('#m2')
        .evaluate((e) => e.nextElementSibling.querySelector('path').getAttribute('stroke'))) ===
        '#00f',
  );
  await press(page, 'ArrowRight'); // click 3: the range starts
  await settle();
  t.ok('click 3 draws the ranged mark', (await marks()) === 5, String(await marks()));
  await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'click 4 ends the range, so that mark is gone again',
    (await marks()) === 4,
    String(await marks()),
  );
  t.ok(
    'highlight with .op50 has half opacity',
    (await page.locator('#m5').evaluate((e) => e.previousElementSibling.style.opacity)) === '0.5',
  );
  await press(page, 'ArrowLeft');
  await settle();
  t.ok('going back brings the ranged mark back', (await marks()) === 5);

  // slide-ng-motion: starts at initial, moves to enter, click variants follow the clicks.
  await page.goto(page.url().split('?')[0]);
  await page.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await settle();
  t.ok(
    'slide-ng-motion ends in the enter state (translate 0, opacity 1)',
    (await tr('#mo')) === 'matrix(1, 0, 0, 1, 0, 0)' &&
      (await page.locator('#mo').evaluate((e) => getComputedStyle(e).opacity)) === '1',
    await tr('#mo'),
  );
  t.ok(
    'the element has a CSS transition set',
    (await page.locator('#mo').evaluate((e) => e.style.transition)).includes('transform'),
  );
  for (let i = 0; i < 4; i++) await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'click-4 moves it down by 40px',
    (await tr('#mo')) === 'matrix(1, 0, 0, 1, 0, 40)',
    await tr('#mo'),
  );
  await press(page, 'ArrowLeft');
  await settle();
  t.ok(
    'going back to click 3 puts it back',
    (await tr('#mo')) === 'matrix(1, 0, 0, 1, 0, 0)',
    await tr('#mo'),
  );

  // slide-ng-motion with slide-ng-click on the same element: initial before the click, enter during, leave after.
  await page.goto(`${page.url().split('?')[0]}?clicks=4`);
  await page.waitForFunction(() =>
    /clicks 4\/6/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await settle();
  t.ok(
    'slide-ng-click.up="[5, 6]" is hidden before its click',
    await page.locator('#mo3').evaluate((e) => e.classList.contains('slidev-vclick-hidden')),
  );
  t.ok(
    'before its click the element is hidden and at initial',
    (await tr('#mo2')) === 'matrix(1, 0, 0, 1, -50, 0)' &&
      (await page.locator('#mo2').evaluate((e) => e.classList.contains('slidev-vclick-hidden'))),
    await tr('#mo2'),
  );
  await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'at its click it moves to enter',
    (await tr('#mo2')) === 'matrix(1, 0, 0, 1, 0, 0)',
    await tr('#mo2'),
  );
  const mo3 = () =>
    page
      .locator('#mo3')
      .evaluate((e) => `${e.className} translate=${getComputedStyle(e).translate}`);
  t.ok(
    'slide-ng-click.up="[5, 6]": a range written as text, with a preset, shows at its first click',
    /slidev-vclick-anim-up/.test(await mo3()) &&
      !/slidev-vclick-hidden/.test(await mo3()) &&
      (await mo3()).endsWith('translate=none'),
    await mo3(),
  );
  await press(page, 'ArrowRight');
  await settle();
  t.ok(
    'slide-ng-click.up="[5, 6]": hidden again at its end click, at the preset offset',
    /slidev-vclick-hidden/.test(await mo3()) && (await mo3()).endsWith('translate=0px 20px'),
    await mo3(),
  );
  await page.close();
}
