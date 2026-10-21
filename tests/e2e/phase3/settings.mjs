// The settings menu (Slidev's): filters, cursor style, scale, wake lock, idle cursor, then dark mode, camera options and the PDF stub.
export async function run({ t, open }) {
  const page = await open('/presenter/1');
  await page.bringToFront();
  const menu = async () => {
    await page.locator('#nav-settings').click();
    await page.waitForTimeout(250);
  };
  await menu();
  const ids = await page.locator('#settings-menu [id]').evaluateAll((l) => l.map((e) => e.id));
  for (const id of [
    'settings-dark',
    'filter-invert',
    'filter-brightness',
    'filter-contrast',
    'filter-saturate',
    'filter-sepia',
    'filter-hueRotate',
    'filter-hueRotate-number',
    'cursor-style-cursor',
    'cursor-style-laser',
    'wake-lock',
    'settings-cursor',
    'camera-select',
    'mic-select',
    'record-screen',
    'download-pdf',
  ]) {
    t.ok(`settings has #${id}`, ids.includes(id), ids.join());
  }
  t.ok('Slidev has no Reset filters link', !ids.includes('filter-reset'));
  t.ok(
    'the presenter menu has no Slide Scale and no Hide Idle Cursor (as in Slidev)',
    !ids.includes('scale-fit') && !ids.includes('hide-idle-cursor'),
  );
  const labels = (await page.locator('#settings-menu .slidev-form-title').allInnerTexts()).map(
    (x) => x.trim(),
  );
  t.ok(
    'labels and order follow Slidev',
    labels.slice(0, 8).join('|') ===
      'Invert|Brightness|Contrast|Saturation|Sepia|Hue Rotate|Cursor Style|Wake Lock',
    labels.join('|'),
  );
  const nums = await page
    .locator('#settings-menu input[type=number]')
    .evaluateAll((l) => l.map((e) => `${e.value}:${e.min}:${e.max}:${e.step}`));
  t.ok(
    'defaults and ranges match Slidev',
    nums.join(' ') === '1:0.5:1.5:0.02 1:0.5:1.5:0.02 1:0.5:1.5:0.02 0:-2:2:0.02 0:-180:180:0.1',
    nums.join(' '),
  );
  t.ok(
    'the PDF entry is disabled while the deck has no PDF next to it',
    await page.locator('#download-pdf').isDisabled(),
  );

  // the dock follows Slidev's order
  const dock = await page.locator('nav [id^=nav-]').evaluateAll((l) => l.map((e) => e.id));
  const order = [
    'nav-dark',
    'nav-camera',
    'nav-record',
    'nav-cursor',
    'nav-drawing',
    'nav-play',
    'nav-layout',
    'nav-sync',
    'nav-settings',
    'nav-counter',
  ];
  t.ok(
    'dock order: schema, recording, cursor, drawing, mode, layout, sync, settings, counter',
    order.every((id, i) => dock.indexOf(id) > (i ? dock.indexOf(order[i - 1]) : -1)),
    dock.join(),
  );

  // dark mode
  await page.locator('#settings-dark').check();
  await page.waitForTimeout(200);
  t.ok(
    'Dark Mode switches the page',
    await page.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  await page.locator('#settings-dark').uncheck();
  await page.waitForTimeout(200);
  t.ok(
    'and back',
    !(await page.evaluate(() => document.documentElement.classList.contains('dark'))),
  );

  // filters
  const canvasFilter = () =>
    page
      .locator('.canvas')
      .first()
      .evaluate((e) => getComputedStyle(e).filter);
  t.ok('no filter at first', (await canvasFilter()) === 'none');
  await page.locator('#filter-brightness').fill('1.5');
  await page.waitForTimeout(200);
  t.ok(
    'a changed filter puts a dot on the settings button (as in Slidev)',
    (await page.locator('#nav-settings-dot').count()) === 1,
  );
  t.ok(
    'the brightness slider filters the slide',
    (await canvasFilter()).includes('brightness(1.5)'),
    await canvasFilter(),
  );
  t.ok(
    'the number box follows the slider',
    (await page.locator('#filter-brightness-number').inputValue()) === '1.5',
  );
  await page.locator('#filter-hueRotate-number').fill('90');
  await page.locator('#filter-invert').check();
  await page.locator('#filter-sepia').fill('0.5');
  await page.waitForTimeout(200);
  const f = await canvasFilter();
  t.ok(
    'hue rotate, sepia and invert filter the slide',
    f.includes('hue-rotate(90deg)') && f.includes('sepia(0.5)') && f.includes('invert(1)'),
    f,
  );
  t.ok(
    'the choice is remembered',
    (await page.evaluate(() => localStorage.getItem('slidev-viewer-css-filter'))).includes('1.5'),
  );
  await page.locator('#filter-brightness-number').fill('1');
  await page.locator('#filter-hueRotate').dblclick({ position: { x: 5, y: 5 } });
  await page.locator('#filter-hueRotate-number').fill('0');
  await page.locator('#filter-sepia-number').fill('0');
  await page.locator('#filter-invert').uncheck();
  await page.waitForTimeout(200);
  t.ok('setting the defaults again clears it', (await canvasFilter()) === 'none');
  t.ok('and removes the dot', (await page.locator('#nav-settings-dot').count()) === 0);

  // cursor options
  t.ok(
    'laser style is chosen in the menu',
    await (async () => {
      await page.locator('#cursor-style-laser').click();
      await page.waitForTimeout(200);
      return (await page.locator('#nav-cursor').getAttribute('title')) === 'Disable laser pointer';
    })(),
  );
  await page.locator('#cursor-style-cursor').click();
  await page.locator('#settings-cursor').uncheck();
  await page.waitForTimeout(200);
  t.ok(
    'Show Presenter Cursor follows the bar button',
    (await page.locator('#nav-cursor').getAttribute('title')) === 'Show presenter cursor',
  );
  await page.locator('#settings-cursor').check();

  // wake lock: the headmatter turns it on
  t.ok(
    'wakeLock: true in the headmatter starts with it on',
    await page.locator('#wake-lock').isChecked(),
  );
  const held = await page.locator('#wake-lock').getAttribute('data-held');
  if (held === 'true') t.ok('the browser holds the lock', true);
  else
    console.log(
      'NOT VERIFIED wake lock held: this browser refused the request (headless), only the setting is checked',
    );
  await page.locator('#wake-lock').uncheck();
  await page.waitForTimeout(200);
  t.ok(
    'it can be turned off and that is remembered',
    (await page.evaluate(() => localStorage.getItem('slidev-wake-lock'))) === 'false',
  );
  await page.reload();
  await page.waitForFunction(() => document.querySelector('#hud'));
  await menu();
  t.ok(
    'the choice wins over the headmatter after a reload',
    !(await page.locator('#wake-lock').isChecked()),
  );

  // the play page: Slide Scale and Hide Idle Cursor appear, the presenter-only entry does not
  const play = await open('/1');
  await play.locator('#nav-settings').click();
  await play.waitForTimeout(250);
  t.ok(
    'the play page hides the presenter cursor entry and shows scale and idle cursor',
    (await play.locator('#settings-cursor').count()) === 0 &&
      (await play.locator('#scale-fit').count()) === 1 &&
      (await play.locator('#hide-idle-cursor').count()) === 1,
  );
  t.ok(
    'Cursor Style starts on Cursor and Fit is the scale',
    (await play.locator('#cursor-style-cursor').getAttribute('aria-pressed')) === 'true' &&
      (await play.locator('#scale-fit').getAttribute('aria-pressed')) === 'true',
  );
  await play.locator('#cursor-style-laser').click();
  await play.waitForTimeout(200);
  await play.mouse.click(1200, 100); // closes the menu
  await play.mouse.move(500, 300, { steps: 3 });
  await play.waitForTimeout(300);
  const dot = await play.locator('#laser-pointer').count();
  t.ok('the laser dot follows the pointer on the slide in the main view', dot === 1);
  t.ok(
    'and the real cursor is hidden there',
    (await play.evaluate(() => getComputedStyle(document.querySelector('.slide-show')).cursor)) ===
      'none',
  );
  await play.reload();
  await play.waitForFunction(() => document.querySelector('#hud'));
  await play.mouse.move(500, 320, { steps: 3 });
  await play.waitForTimeout(300);
  t.ok(
    'the cursor style is remembered after a reload',
    (await play.evaluate(() => localStorage.getItem('slidev-cursor-style'))) === '"laser"' &&
      (await play.locator('#laser-pointer').count()) === 1,
  );
  await play.evaluate(() => localStorage.removeItem('slidev-cursor-style'));
  await play.close();
  await page.close();

  // At 400% zoom (a 1280x720 window is 320x180 CSS pixels) the menus and the info dialog stay inside the window and
  // scroll (WCAG 1.4.10).
  const zoomed = await open('/1');
  await zoomed.setViewportSize({ width: 320, height: 180 });
  await zoomed.waitForTimeout(300);
  const inside = (sel) =>
    zoomed.locator(sel).evaluate((e) => {
      const r = e.getBoundingClientRect();
      const fits = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
      return {
        fits,
        scrolls:
          e.scrollHeight <= e.clientHeight + 1 || getComputedStyle(e).overflowY !== 'visible',
        r: [r.top, r.bottom].map(Math.round),
      };
    });
  t.ok(
    'the settings button says whether its menu is open',
    (await zoomed.locator('#nav-settings').getAttribute('aria-expanded')) === 'false' &&
      (await zoomed.locator('#nav-settings').getAttribute('aria-haspopup')) === 'true',
  );
  for (const [button, box] of [
    ['#nav-settings', '#settings-menu'],
    ['#nav-sync', '#sync-menu'],
    ['#nav-info', '#info-dialog [role="dialog"]'],
  ]) {
    await zoomed.locator(button).focus();
    await zoomed.keyboard.press('Enter');
    await zoomed.waitForTimeout(400);
    const fit = await inside(box);
    t.ok(
      `at 400% zoom ${box} stays inside the window`,
      fit.fits && fit.scrolls,
      JSON.stringify(fit),
    );
    if (button === '#nav-settings')
      t.ok(
        'the settings button says its menu is open',
        (await zoomed.locator('#nav-settings').getAttribute('aria-expanded')) === 'true',
      );
    await zoomed.keyboard.press('Escape');
    await zoomed.waitForTimeout(300);
  }
  await zoomed.close();
}
