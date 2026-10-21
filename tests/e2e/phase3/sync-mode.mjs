// The sync mode menu of the bar (Slidev's SyncControls): both ways, receive only, send only, off.
export async function run({ t, open, press, hud, windowGroup }) {
  const group = await windowGroup();
  const presenter = await open('/presenter/1', undefined, undefined, group);
  const viewer = await open('/1', undefined, undefined, group);
  await viewer.waitForTimeout(400);

  const openMenu = async (page) => {
    if (await page.locator('#sync-menu').count()) return; // already open: a click would close it
    await page.locator('nav').first().hover();
    await page.locator('#nav-sync').click();
    await page.waitForSelector('#sync-menu');
  };
  const checked = (page) =>
    page.locator('#sync-menu [aria-checked="true"]').getAttribute('data-mode');
  const choose = async (page, mode) => {
    await page.locator(`#sync-menu [data-mode="${mode}"]`).click();
    await page.waitForTimeout(150);
  };

  await openMenu(viewer);
  const text = await viewer.locator('#sync-menu').innerText();
  const labels = await viewer.locator('#sync-menu .sync-mode').allInnerTexts();
  t.ok(
    'the sync menu names the role and lists the four modes in Slidev order',
    /Slides navigation syncing for\s+viewer/.test(text) &&
      text.includes('Sync Mode') &&
      labels.map((l) => l.trim()).join() === 'Bidirectional Sync,Receive Only,Send Only,Disable',
    JSON.stringify(labels),
  );
  t.ok('both ways is ticked at first', (await checked(viewer)) === 'bidirectional');
  const order = await viewer
    .locator('#nav-sync')
    .evaluate(
      (b) => b.closest('app-sync-controls').nextElementSibling?.querySelector('button')?.id,
    );
  t.ok('the sync button sits before the settings button', order === 'nav-settings', order);

  // Receive only: the viewer follows the presenter, but its own moves stay here.
  await choose(viewer, 'receive-only');
  t.ok('a choice is ticked', (await checked(viewer)) === 'receive-only');
  const arrows = await viewer
    .locator('#nav-sync > div')
    .evaluateAll((l) => l.map((e) => (e.classList.contains('op30') ? 'off' : 'on')).join());
  t.ok('the button shows send off and receive on', arrows === 'off,on', arrows);
  await viewer.mouse.click(5, 5); // outside: closes the menu
  await viewer.waitForTimeout(200);
  t.ok('a click outside closes the menu', (await viewer.locator('#sync-menu').count()) === 0);
  await press(presenter, 'ArrowRight', 500);
  t.ok(
    'receive only: the viewer follows the presenter',
    (await hud(viewer)).startsWith('slide 2/4'),
    await hud(viewer),
  );
  await press(viewer, 'ArrowRight', 400);
  await press(viewer, 'ArrowRight', 500);
  t.ok(
    'receive only: the viewer does not move the presenter',
    (await hud(presenter)).startsWith('slide 2/4') &&
      (await hud(viewer)).startsWith('slide 2/4 clicks 2'),
    `${await hud(presenter)} / ${await hud(viewer)}`,
  );

  // Off: the viewer no longer follows either.
  await openMenu(viewer);
  await choose(viewer, 'off');
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 500);
  t.ok(
    'disable: the viewer stays where it is',
    (await hud(presenter)).startsWith('slide 3/4') && (await hud(viewer)).startsWith('slide 2/4'),
    `${await hud(presenter)} / ${await hud(viewer)}`,
  );

  // The choice is kept (per browser, like Slidev) and the presenter has its own.
  await viewer.reload();
  await viewer.waitForSelector('#hud');
  await openMenu(viewer);
  t.ok('the mode is remembered after a reload', (await checked(viewer)) === 'off');
  await openMenu(presenter);
  t.ok(
    'the presenter has its own mode, named in the menu',
    (await checked(presenter)) === 'bidirectional' &&
      /syncing for\s+presenter/.test(await presenter.locator('#sync-menu').innerText()),
  );
  await choose(presenter, 'bidirectional');
  await openMenu(viewer);
  await choose(viewer, 'bidirectional');
  await press(presenter, 'ArrowLeft', 500);
  t.ok(
    'back to both ways: the viewer follows again',
    (await hud(viewer)) === (await hud(presenter)),
    `${await hud(presenter)} / ${await hud(viewer)}`,
  );

  // The keyboard: arrows inside the menu move between the modes, not through the slides; Escape closes it.
  await openMenu(viewer);
  await viewer.locator('#sync-menu [data-mode="bidirectional"]').focus();
  const before = await hud(viewer);
  await press(viewer, 'ArrowDown', 300);
  t.ok(
    'ArrowDown in the menu picks the next mode and does not move the slide',
    (await checked(viewer)) === 'receive-only' && (await hud(viewer)) === before,
    `${await checked(viewer)} / ${before} -> ${await hud(viewer)}`,
  );
  await press(viewer, 'ArrowUp', 300);
  t.ok(
    'ArrowUp goes back, the slide stays',
    (await checked(viewer)) === 'bidirectional' && (await hud(viewer)) === before,
  );
  await press(viewer, 'Escape', 300);
  t.ok('Escape closes the sync menu', (await viewer.locator('#sync-menu').count()) === 0);
  await group.close();
}
