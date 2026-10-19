// The bottom-left bar, the overview, the right-click menu, dark mode, the info dialog and the settings menu.
export async function run({ t, open, press, pathOf, style, base, browser, problems }) {
  let page = await open('/1');

  // ---- navigation bar ---------------------------------------------------------------
  t.ok(
    'bar is hidden until the mouse is at the bottom left',
    (await style(
      page,
      '#nav-fullscreen >> xpath=ancestor::div[contains(@class,"transition")]',
      'opacity',
    )) === '0',
  );
  await page.mouse.move(40, 700);
  await page.waitForTimeout(500);
  t.ok(
    'bar shows when the mouse is at the bottom left',
    (await style(
      page,
      '#nav-fullscreen >> xpath=ancestor::div[contains(@class,"transition")]',
      'opacity',
    )) === '1',
  );
  const titles = await page.locator('nav button').evaluateAll((els) => els.map((e) => e.title));
  t.ok(
    'bar buttons are in Slidev order',
    titles.join('|') ===
      [
        'Enter fullscreen',
        'Go to previous slide',
        'Go to next slide',
        'Show slide overview',
        'Switch to dark mode theme',
        'Show drawing toolbar',
        'Presenter Mode',
        'Show info',
        'More Options',
      ].join('|'),
    titles.join('|'),
  );
  t.ok(
    'counter reads 1 / 37',
    (await page.locator('#nav-counter').innerText()).replace(/\s+/g, ' ').trim() === '1 / 37',
  );
  t.ok(
    'previous is disabled on the first slide',
    await page.locator('#nav-prev').evaluate((e) => e.classList.contains('disabled')),
  );
  t.ok(
    'the drawing and presenter buttons are live',
    await page
      .locator('#nav-drawing, #nav-presenter')
      .evaluateAll((l) => l.length === 2 && l.every((e) => !e.classList.contains('disabled'))),
  );
  t.ok(
    'icons come from the carbon set',
    (await style(page, '#nav-next div', 'maskImage')).startsWith('url("data:image/svg+xml'),
  );

  await page.locator('#nav-next').click();
  await page.waitForTimeout(200);
  t.ok(
    'next button goes to slide 2',
    pathOf(page) === '/2' && (await page.locator('#nav-counter').innerText()).includes('2'),
  );
  await page.locator('#nav-prev').click();
  await page.waitForTimeout(200);
  t.ok('previous button goes back to slide 1', pathOf(page) === '/1');

  const flag = () => page.locator('nav').getAttribute('data-fullscreen');
  t.ok('fullscreen flag starts false', (await flag()) === 'false');
  await page.locator('#nav-fullscreen').click();
  await page.waitForTimeout(400);
  t.ok(
    'fullscreen button sets the flag and changes its title',
    (await flag()) === 'true' &&
      (await page.locator('#nav-fullscreen').getAttribute('title')) === 'Close fullscreen',
    await flag(),
  );
  await page.locator('#nav-fullscreen').click();
  await page.waitForTimeout(400);
  t.ok('fullscreen button toggles it back', (await flag()) === 'false');

  // ---- overview ---------------------------------------------------------------------
  await page.locator('#nav-overview').click();
  await page.waitForTimeout(300);
  t.ok(
    'overview opens from the button with one card per slide',
    (await page.locator('#overview').count()) === 1 &&
      (await page.locator('.overview-card').count()) === 37,
  );
  t.ok(
    'overview cards draw the real slides',
    (await page.locator('.overview-card[data-no="1"] sn-cover h1').innerText()) === 'Showcase',
  );
  const thumb = await page.locator('.overview-card[data-no="1"]').boundingBox();
  t.ok('a thumbnail is 300px wide', Math.abs(thumb.width - 302) < 4, String(thumb.width));
  await page.locator('#overview-close').click();
  await page.waitForTimeout(200);
  t.ok('overview closes with its close button', (await page.locator('#overview').count()) === 0);
  await press(page, 'o');
  await press(page, 'Escape');
  t.ok('o opens and Escape closes the overview', (await page.locator('#overview').count()) === 0);
  await press(page, 'o');
  t.ok(
    'the current slide is highlighted',
    (await page.locator('.overview-card[data-no="1"]').getAttribute('class')).includes(
      'border-primary',
    ),
  );
  await press(page, 'ArrowRight');
  await press(page, 'ArrowRight');
  t.ok(
    'arrows move the highlight in the overview',
    (await page.locator('.overview-card[data-no="3"]').getAttribute('class')).includes(
      'border-primary',
    ) && pathOf(page) === '/1',
  );
  await press(page, 'Enter');
  t.ok(
    'Enter opens the highlighted slide and closes the overview',
    pathOf(page) === '/3' && (await page.locator('#overview').count()) === 0,
  );
  await press(page, '`');
  const card = page.locator('.overview-card[data-no="28"]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  t.ok(
    'overview draws a slide at its last click',
    (await card.locator('.slidev-vclick-target').count()) === 1 &&
      (await card.locator('.slidev-vclick-hidden').count()) === 0,
  );
  await card.click();
  await page.waitForTimeout(300);
  t.ok(
    'clicking a card goes to that slide',
    pathOf(page) === '/28' && (await page.locator('#overview').count()) === 0,
    pathOf(page),
  );

  // ---- dark mode --------------------------------------------------------------------
  const isDark = () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  t.ok('starts in light mode', !(await isDark()));
  const light = await style(page, '.canvas', 'backgroundColor');
  await page.mouse.move(40, 700);
  await page.waitForTimeout(400);
  t.ok('the bar has no dark mode button', (await page.locator('#nav-dark').count()) === 0);
  await press(page, 'd');
  await page.waitForTimeout(200);
  t.ok(
    'd turns dark mode on',
    (await isDark()) && (await style(page, '.canvas', 'backgroundColor')) !== light,
  );
  await page.reload();
  await page.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  t.ok(
    'dark mode is remembered after a reload',
    (await isDark()) &&
      (await page.evaluate(() => localStorage.getItem('slidev-color-schema'))) === 'dark',
  );
  await press(page, 'd');
  t.ok(
    'd toggles back to light',
    !(await isDark()) &&
      (await page.evaluate(() => localStorage.getItem('slidev-color-schema'))) === 'auto',
  );

  // ---- right-click menu -------------------------------------------------------------
  await page.mouse.click(400, 300, { button: 'right' });
  await page.waitForTimeout(200);
  t.ok('right click opens the context menu', (await page.locator('#context-menu').count()) === 1);
  const arrows = await page
    .locator('#context-menu .menu-small')
    .evaluateAll((l) => l.map((e) => e.title));
  t.ok(
    'menu starts with four arrows',
    arrows.join('|') === 'Previous Click|Next Click|Previous Slide|Next Slide',
    arrows.join('|'),
  );
  const labels = await page.locator('#context-menu .slidev-menu-item').allInnerTexts();
  t.ok(
    'menu entries match Slidev',
    labels.map((l) => l.trim()).join('|') ===
      'Show drawing toolbar|Show slide overview|Enter Presenter Mode|Enter fullscreen',
    labels.join('|'),
  );
  t.ok(
    'no entry of the menu is disabled',
    (await page.locator('#context-menu .slidev-menu-item.disabled').count()) === 0,
  );
  t.ok(
    'menu has the native-menu hint',
    (await page.locator('#context-menu').innerText()).includes(
      'Hold Shift and right click to open the native context menu',
    ),
  );
  await page.locator('#context-menu [title="Next Slide"]').click();
  await page.waitForTimeout(200);
  t.ok(
    'an arrow in the menu moves and closes the menu',
    pathOf(page) === '/29' && (await page.locator('#context-menu').count()) === 0,
    pathOf(page),
  );
  await page.mouse.click(400, 300, { button: 'right' });
  await page.waitForTimeout(100);
  await page
    .locator('#context-menu', { hasText: 'Show slide overview' })
    .getByText('Show slide overview')
    .click();
  await page.waitForTimeout(300);
  t.ok('Show slide overview opens the overview', (await page.locator('#overview').count()) === 1);
  await press(page, 'Escape');
  await page.keyboard.down('Shift');
  await page.mouse.click(400, 300, { button: 'right' });
  await page.keyboard.up('Shift');
  await page.waitForTimeout(100);
  t.ok(
    'Shift + right click leaves the native menu alone',
    (await page.locator('#context-menu').count()) === 0,
  );
  await page.mouse.click(400, 300, { button: 'right' });
  await page.waitForTimeout(150); // the menu opens one tick later
  await page.mouse.click(100, 100);
  await page.waitForTimeout(100);
  t.ok('a click elsewhere closes the menu', (await page.locator('#context-menu').count()) === 0);
  await page.mouse.click(400, 300, { button: 'right' });
  await press(page, 'Escape');
  t.ok('Escape closes the menu', (await page.locator('#context-menu').count()) === 0);

  // ---- info dialog and settings -------------------------------------------------------
  await page.mouse.move(40, 700);
  await page.waitForTimeout(400);
  await page.locator('#nav-info').click();
  t.ok(
    'info dialog shows the headmatter info',
    (await page.locator('#info-dialog strong').innerText()) === 'Bold info.' &&
      (await page.locator('#info-dialog').innerText()).includes('slide.ng'),
  );
  await press(page, 'Escape');
  t.ok('Escape closes the info dialog', (await page.locator('#info-dialog').count()) === 0);
  await page.locator('#nav-settings').click();
  await page.waitForTimeout(150);
  t.ok('settings menu opens', (await page.locator('#settings-menu').count()) === 1);
  await page.locator('#scale-1').click();
  await page.waitForTimeout(200);
  const canvas = await page.locator('.canvas').boundingBox();
  t.ok(
    '1:1 scale shows the slide at its real size',
    Math.abs(canvas.width - 980) < 2,
    String(canvas.width),
  );
  await page.locator('#scale-fit').click();
  await page.mouse.click(1200, 100);
  await page.waitForTimeout(150);
  t.ok(
    'a click outside closes the settings menu',
    (await page.locator('#settings-menu').count()) === 0,
  );
  await page.close();

  // ---- dark follows a colour scheme chosen by the deck ----------------------------------
  const sys = await browser.newPage({ colorScheme: 'dark' });
  sys.on('pageerror', (e) => problems.push(String(e)));
  await sys.goto(base + '/3');
  await sys.waitForFunction(() => /clicks/.test(document.querySelector('#hud')?.innerText ?? ''));
  await sys.waitForTimeout(200);
  t.ok(
    'auto mode follows the system colour scheme',
    await sys.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  await sys.close();
}
