// Keyboard shortcuts, as in Slidev (setup/shortcuts.ts), and the goto box.
export async function run({ t, open, press, pathOf, hud }) {
  const page = await open('/3');
  const at = () => pathOf(page);

  await press(page, 'Space');
  t.ok('space goes to the next slide', at() === '/4');
  await press(page, 'Shift+Space');
  t.ok('shift + space goes back', at() === '/3');
  await press(page, 'ArrowDown');
  t.ok('down arrow = next slide', at() === '/4');
  await press(page, 'ArrowUp');
  t.ok('up arrow = previous slide', at() === '/3');
  await press(page, 'Shift+ArrowRight');
  t.ok('shift + right = next slide', at() === '/4');
  await press(page, 'Shift+ArrowLeft');
  t.ok('shift + left = previous slide', at() === '/3');
  await press(page, 'PageDown');
  t.ok('page down = next', at() === '/4');
  await press(page, 'PageUp');
  t.ok('page up = previous', at() === '/3');
  await press(page, 'Enter');
  t.ok('Enter does nothing outside the overview', at() === '/3');

  // Next and previous move through the clicks of a slide before changing slide (slide 28 has 3).
  await page.goto(page.url().split('?')[0].replace(/\/3$/, '/28'));
  await page.waitForFunction(() =>
    /slide 28/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await press(page, 'Shift+ArrowRight');
  t.ok('shift + right skips the clicks', at() === '/29');
  await press(page, 'ArrowLeft');
  t.ok(
    'left from the next slide lands on the last click of the previous slide',
    at() === '/28' && (await hud(page)) === 'slide 28/37 clicks 3/3',
    await hud(page),
  );

  // ---- goto box ---------------------------------------------------------------------
  await press(page, 'g');
  t.ok(
    'g opens the goto box and focuses it',
    await page.locator('#slidev-goto-input').evaluate((e) => e === document.activeElement),
  );
  await page.keyboard.type('12');
  await page.waitForTimeout(100);
  t.ok(
    'typing a number lists matching slides',
    (await page.locator('#goto-results li').first().innerText()).includes('12'),
  );
  await press(page, 'Enter');
  t.ok('Enter goes to the slide', at() === '/12', at());
  await press(page, 'g');
  await page.keyboard.type('part b');
  await page.waitForTimeout(100);
  t.ok('goto also searches titles', (await page.locator('#goto-results li').count()) === 1);
  await press(page, 'Enter');
  t.ok('goto by title opens Part B', at() === '/24', at());
  await press(page, 'g');
  await page.keyboard.type('zdf'); // d and f are shortcuts, but not while typing in the box
  await page.waitForTimeout(100);
  const typedSafely =
    !(await page.evaluate(() => document.documentElement.classList.contains('dark'))) &&
    (await page.locator('nav').getAttribute('data-fullscreen')) === 'false';
  await press(page, 'Escape');
  t.ok(
    'Escape closes the goto box without moving',
    at() === '/24' &&
      (await page.locator('#goto-results').count()) === 0 &&
      (await page.locator('#slidev-goto-dialog').evaluate((e) => e.classList.contains('op0'))),
  );
  t.ok('letters typed into the goto box are not shortcuts', typedSafely);

  await press(page, 'f', 500);
  t.ok(
    'f toggles fullscreen',
    (await page.locator('nav').getAttribute('data-fullscreen')) === 'true',
  );
  await press(page, 'f', 500);
  t.ok(
    'f again leaves fullscreen',
    (await page.locator('nav').getAttribute('data-fullscreen')) === 'false',
  );
  await page.close();
}
