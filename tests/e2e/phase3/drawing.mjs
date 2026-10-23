// Drawing: toolbar, tools, colours, undo, clear, sync between windows and persistence in the browser.
export async function run({ t, open, hud, windowGroup, browser }) {
  const group = await windowGroup();
  const presenter = await open('/presenter/1', undefined, undefined, group);
  const viewer = await open('/1', undefined, undefined, group);
  await presenter.bringToFront();
  const count = (page, sel = '#drawing-layer > *') => page.locator(sel).count();
  const tags = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('#drawing-layer > *')].map((e) => e.localName).join(),
    );
  const stroke = async (page, from, to) => {
    await page.bringToFront();
    const b = await page.locator('#slide-content').boundingBox();
    await page.mouse.move(b.x + b.width * from[0], b.y + b.height * from[1]);
    await page.mouse.down();
    await page.mouse.move(
      b.x + (b.width * (from[0] + to[0])) / 2,
      b.y + (b.height * (from[1] + to[1])) / 2,
      { steps: 4 },
    );
    await page.mouse.move(b.x + b.width * to[0], b.y + b.height * to[1], { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  t.ok('no toolbar at first', (await presenter.locator('#drawing-toolbar').count()) === 0);
  await presenter.locator('#nav-drawing').click();
  await presenter.waitForTimeout(300);
  t.ok(
    'the pen button opens the toolbar',
    (await presenter.locator('#drawing-toolbar').count()) === 1 &&
      (await presenter.locator('#nav-drawing').getAttribute('title')) === 'Hide drawing toolbar',
  );
  const titles = await presenter
    .locator('#drawing-toolbar button')
    .evaluateAll((l) => l.map((e) => e.title).filter(Boolean));
  t.ok(
    'the toolbar has the tools, width, colours, undo, redo, delete, pin',
    [
      'Draw with stylus',
      'Draw a line',
      'Draw an arrow',
      'Draw an ellipse',
      'Draw a rectangle',
      'Erase',
      'Adjust stroke width',
      'Undo',
      'Redo',
      'Delete',
      'Pin drawing',
    ].every((x) => titles.includes(x)) &&
      titles.filter((x) => x.startsWith('Brush color: ')).length === 7,
    titles.join('|'),
  );
  const off = (id) => presenter.locator(id).isDisabled();
  t.ok(
    'with nothing drawn, undo, redo and delete are disabled buttons',
    (await off('#draw-undo')) && (await off('#draw-redo')) && (await off('#draw-clear')),
  );

  // ---- drawing with the stylus tool (the default) and the other tools
  await stroke(presenter, [0.2, 0.3], [0.5, 0.6]);
  t.ok('a stroke makes a path', (await tags(presenter)) === 'path', await tags(presenter));
  t.ok(
    'then undo and delete can be pressed, redo not yet',
    !(await off('#draw-undo')) && !(await off('#draw-clear')) && (await off('#draw-redo')),
  );
  t.ok('the viewer shows it at once', (await tags(viewer)) === 'path', await tags(viewer));
  await presenter.keyboard.press('l');
  await stroke(presenter, [0.6, 0.2], [0.8, 0.4]);
  await presenter.keyboard.press('r');
  await stroke(presenter, [0.1, 0.7], [0.3, 0.9]);
  await presenter.keyboard.press('e');
  await stroke(presenter, [0.5, 0.7], [0.7, 0.9]);
  await presenter.keyboard.press('a');
  await stroke(presenter, [0.75, 0.6], [0.95, 0.8]);
  const kinds = await tags(presenter);
  t.ok(
    'keys l, r, e, a draw a line, a rectangle, an ellipse and an arrow',
    kinds === 'path,line,rect,ellipse,g',
    kinds,
  );
  t.ok('the viewer has the same five shapes', (await tags(viewer)) === kinds);

  // ---- the drawing is on the slide in slide coordinates (the viewer window has another size)
  await viewer.setViewportSize({ width: 900, height: 600 });
  await viewer.waitForTimeout(300);
  const rel = (page) =>
    page.evaluate(() => {
      const path = document.querySelector('#drawing-layer path'),
        canvas = document.querySelector('#slide-content').getBoundingClientRect(),
        r = path.getBoundingClientRect();
      return [(r.left - canvas.left) / canvas.width, (r.top - canvas.top) / canvas.height].map(
        (n) => Math.round(n * 20) / 20,
      );
    });
  const a = await rel(presenter),
    b = await rel(viewer);
  t.ok(
    'the stroke is at the same place of the slide in both windows',
    a[0] === b[0] && a[1] === b[1],
    `${a} / ${b}`,
  );

  // ---- undo, redo, colours
  await presenter.keyboard.press('Control+z');
  await presenter.waitForTimeout(200);
  t.ok(
    'Ctrl+Z undoes the last shape, here and in the viewer',
    (await count(presenter)) === 4 && (await count(viewer)) === 4,
  );
  await presenter.keyboard.press('Control+Shift+z');
  await presenter.waitForTimeout(200);
  t.ok('Ctrl+Shift+Z brings it back', (await count(presenter)) === 5);
  await presenter.keyboard.press('2');
  await presenter.waitForTimeout(150);
  t.ok(
    'digit 2 picks the second colour',
    await presenter
      .locator('.color-btn')
      .nth(1)
      .evaluate((e) => e.classList.contains('active')),
  );
  await presenter.keyboard.press('s');
  await stroke(presenter, [0.4, 0.1], [0.6, 0.15]);
  const lastStroke = await presenter.evaluate(() => {
    const p = [...document.querySelectorAll('#drawing-layer path')].pop();
    return p.getAttribute('stroke') || p.getAttribute('fill');
  });
  t.ok('new strokes use that colour (#ffca3a)', lastStroke === '#ffca3a', lastStroke);

  // ---- the keys of the deck are off while drawing
  await presenter.keyboard.press('d');
  t.ok(
    'd does not switch to dark mode while drawing',
    !(await presenter.evaluate(() => document.documentElement.classList.contains('dark'))),
  );
  await presenter.keyboard.press('o');
  t.ok(
    'o does not open the overview while drawing',
    (await presenter.locator('#overview').count()) === 0,
  );

  // ---- drawings belong to slides
  await presenter.keyboard.press('ArrowDown');
  await presenter.waitForTimeout(400);
  t.ok(
    'another slide starts empty',
    (await hud(presenter)).startsWith('slide 2/') &&
      (await count(presenter)) === 0 &&
      (await count(viewer)) === 0,
  );
  await presenter.keyboard.press('ArrowUp');
  await presenter.waitForTimeout(400);
  t.ok(
    'and the first slide has its drawing back',
    (await count(presenter)) === 6 && (await count(viewer)) === 6,
    `${await count(presenter)}`,
  );

  // ---- overview and next-step picture
  const expanded = await presenter.locator('#nav-drawing').getAttribute('aria-expanded');
  await presenter.locator('#tool-line').focus();
  await presenter.keyboard.press('Escape');
  await presenter.waitForTimeout(150);
  t.ok('Escape closes the toolbar', (await presenter.locator('#drawing-toolbar').count()) === 0);
  t.ok(
    'the pen button says whether the toolbar is open, and Escape on a tool gives it the focus back',
    expanded === 'true' &&
      (await presenter.locator('#nav-drawing').getAttribute('aria-expanded')) === 'false' &&
      (await presenter.evaluate(() => document.activeElement?.id)) === 'nav-drawing',
    `${expanded} ${await presenter.evaluate(() => document.activeElement?.id)}`,
  );
  await presenter.evaluate(() => document.activeElement?.blur());
  await viewer.bringToFront();
  await viewer.keyboard.press('o');
  await viewer.waitForTimeout(500);
  t.ok(
    'the overview card of slide 1 shows the drawing as a picture',
    (await viewer.locator('#overview [data-no="1"] img.drawing-preview').count()) === 1,
  );
  await viewer.keyboard.press('Escape');
  await presenter.bringToFront();
  await presenter.keyboard.press('ArrowDown');
  await presenter.waitForTimeout(300);
  await presenter.keyboard.press('ArrowUp');
  await presenter.waitForTimeout(300);

  // ---- persistence: a reload brings the drawing back
  await presenter.reload();
  await presenter.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await presenter.waitForTimeout(600);
  t.ok(
    'a reload keeps the drawing (localStorage)',
    (await count(presenter)) === 6,
    `${await count(presenter)}`,
  );
  const saved = await presenter.evaluate(() =>
    Object.keys(JSON.parse(localStorage.getItem('slide-ng-drawings') ?? '{}')).join(),
  );
  t.ok('the browser stores the drawing under the slide number', saved === '1', saved);

  // ---- clear with c
  await presenter.locator('#nav-drawing').click();
  await presenter.keyboard.press('c');
  await presenter.waitForTimeout(300);
  t.ok(
    'c clears the slide in both windows',
    (await count(presenter)) === 0 && (await count(viewer)) === 0,
  );

  // ---- the context menu entry
  await presenter.locator('#nav-drawing').click(); // close
  await presenter
    .locator('.grid-section.main')
    .click({ button: 'right', position: { x: 60, y: 60 } });
  await presenter
    .locator('#context-menu', { hasText: 'Show drawing toolbar' })
    .getByText('Show drawing toolbar')
    .click();
  await presenter.waitForTimeout(200);
  t.ok(
    'the context menu opens the toolbar',
    (await presenter.locator('#drawing-toolbar').count()) === 1,
  );
  // ---- pin keeps the toolbar when drawing is off
  await presenter.locator('#draw-pin').click();
  await presenter.locator('#draw-close').click();
  await presenter.waitForTimeout(200);
  t.ok(
    'a pinned toolbar stays (faded) after drawing is switched off',
    (await presenter.locator('#drawing-toolbar').count()) === 1 &&
      (await presenter.locator('#draw-close').count()) === 0,
  );

  // ---- the shape lands under the pointer (letterboxed windows, pixel ratio 2, after a resize)
  const lands = async (page, key, size) => {
    await page.keyboard.press(key);
    const b = await page.locator('#slide-content').boundingBox();
    const from = [b.x + b.width * 0.3, b.y + b.height * 0.3],
      to = [b.x + b.width * 0.6, b.y + b.height * 0.6];
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const e = document.querySelector('#drawing-layer > *').getBoundingClientRect();
      return [e.left, e.top, e.right, e.bottom];
    });
    const pad = 6; // the stroke width
    const off =
      key === 'r'
        ? Math.max(
            Math.abs(r[0] - from[0]),
            Math.abs(r[1] - from[1]),
            Math.abs(r[2] - to[0]),
            Math.abs(r[3] - to[1]),
          )
        : Math.max(
            Math.abs((r[0] + r[2]) / 2 - (from[0] + to[0]) / 2),
            Math.abs((r[1] + r[3]) / 2 - (from[1] + to[1]) / 2),
          );
    t.ok(
      `${key === 'r' ? 'rectangle' : 'pen'} ends where the pointer did, ${size}`,
      off <= (key === 'r' ? pad : 40),
      `off by ${off.toFixed(1)}px`,
    );
  };
  for (const [w, h, dpr, resize, oneToOne] of [
    [1280, 720, 1],
    [1440, 900, 1],
    [1920, 1080, 2],
    [800, 900, 2],
    [1000, 700, 2, [1440, 900]],
    [1440, 900, 2, null, true],
    [1920, 1080, 1, null, true],
  ]) {
    for (const key of ['r', 's']) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h },
        deviceScaleFactor: dpr,
      });
      const page = await open('/1', { width: w, height: h }, undefined, ctx);
      if (resize) {
        await page.setViewportSize({ width: resize[0], height: resize[1] });
        await page.waitForTimeout(300);
      }
      if (oneToOne) {
        await page.locator('#nav-settings').click();
        await page.locator('#scale-1').click();
        await page.locator('#nav-settings').click();
        await page.waitForTimeout(300);
      }
      await page.locator('#nav-drawing').click();
      await page.waitForTimeout(300);
      await lands(
        page,
        key,
        `${resize ? resize.join('x') : w + 'x' + h} at ratio ${dpr}${oneToOne ? ', 1:1' : ''}`,
      );
      await page.evaluate(() => localStorage.clear());
      await ctx.close();
    }
  }
  await presenter.evaluate(() => localStorage.clear());
  await group.close();
}
