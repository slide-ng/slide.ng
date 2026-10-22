// The presenter's panes: dragging the notes borders, sizes kept per layout; no notes editing in a build.
export async function run({ t, open, windowGroup }) {
  const group = await windowGroup();
  const page = await open('/presenter/1', { width: 1280, height: 720 }, undefined, group);
  const note = () =>
    page.locator('.grid-section.note').evaluate((e) => {
      const r = e.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
  const drag = async (sel, dx, dy) => {
    const b = await page.locator(sel).boundingBox();
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(200);
  };
  const layout = async (n) => {
    while ((await page.locator('#nav-layout-no').innerText()) !== String(n)) {
      await page.locator('#nav-layout').click();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(200);
  };
  await layout(1);
  t.ok(
    'a build has no Edit Notes button',
    (await page.locator('#notes-edit').count()) === 0 &&
      (await page.locator('#note-editor').count()) === 0,
  );

  // Layout 1 on a wide window: the notes are the right column; dragging its left border to the left widens it.
  const before = await note();
  await drag('#pane-resize-width', -100, 0);
  const wider = await note();
  t.ok(
    'dragging the notes border widens the notes column by the distance',
    Math.abs(wider.w - before.w - 100) <= 2,
    `${before.w} -> ${wider.w}`,
  );
  await drag('#pane-resize-rows', 0, -60);
  const taller = await note();
  t.ok(
    'dragging the border above the notes makes them taller',
    Math.abs(taller.h - wider.h - 60) <= 2,
    `${wider.h} -> ${taller.h}`,
  );
  await drag('#pane-resize-width', -2000, 0);
  t.ok(
    'the width stops at its limit',
    (await page.locator('#pane-resize-width').getAttribute('aria-valuenow')) === '720',
  );
  await drag('#pane-resize-width', 1000, 0);
  t.ok(
    'and at its minimum the other way',
    (await page.locator('#pane-resize-width').getAttribute('aria-valuenow')) === '240',
  );
  // The keyboard way: a Tab stop, the arrows move the border (Shift: further), Home and End go to the limits.
  const handle = page.locator('#pane-resize-width');
  const value = () => handle.getAttribute('aria-valuenow');
  await handle.focus();
  const steps = [];
  for (const key of ['ArrowLeft', 'Shift+ArrowLeft', 'End', 'ArrowRight', 'Home']) {
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
    steps.push(await value());
  }
  t.ok(
    'the notes borders resize from the keyboard, with their limits for screen readers',
    (await handle.getAttribute('tabindex')) === '0' &&
      (await handle.getAttribute('aria-valuemin')) === '240' &&
      (await handle.getAttribute('aria-valuemax')) === '720' &&
      steps.join() === '256,320,720,704,240' &&
      (await page.locator('#pane-resize-rows').getAttribute('tabindex')) === '0' &&
      new URL(page.url()).pathname === '/presenter/1',
    `${steps.join()} ${page.url()}`,
  );
  await page.evaluate(() => document.activeElement?.blur());
  await drag('#pane-resize-width', -160, 0);

  // Each layout keeps its own sizes.
  await layout(3);
  const third = await note();
  t.ok('layout 3 starts from the default width', Math.abs(third.w - 360) <= 2, String(third.w));
  await drag('#pane-resize-width', 40, 0);
  t.ok(
    'layout 3: the notes are on the left, dragging right widens them',
    Math.abs((await note()).w - 400) <= 2,
    String((await note()).w),
  );
  await layout(1);
  t.ok(
    'back in layout 1 its own width is back',
    (await page.locator('#pane-resize-width').getAttribute('aria-valuenow')) === '400',
  );
  await page.reload();
  await page.waitForSelector('#pane-resize-width');
  await page.waitForTimeout(300);
  t.ok(
    'the sizes are remembered after a reload',
    (await page.locator('#pane-resize-width').getAttribute('aria-valuenow')) === '400' &&
      Math.abs((await note()).w - 400) <= 2,
  );
  await group.close();
}
