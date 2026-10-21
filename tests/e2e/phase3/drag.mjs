// slide-ng-drag: boxes, a named position, a component, an arrow, a bare slide-ng-drag, handles and arrow keys (static build: nothing is written).
export async function run({ t, open, press, hud }) {
  const page = await open('/4');
  const requests = [];
  page.on('request', (r) => {
    if (r.url().includes('__slide-ng')) requests.push(r.url());
  });
  await page.bringToFront();
  const scale = () =>
    page.evaluate(
      () => new DOMMatrix(getComputedStyle(document.querySelector('.canvas')).transform).a,
    );
  const style = (sel, prop) => page.locator(sel).evaluate((e, p) => e.style[p], prop);
  const k = await scale();
  const drag = async (sel, dx, dy) => {
    const b = await page.locator(sel).boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + dx / 2, b.y + b.height / 2 + dy / 2, { steps: 3 });
    await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 3 });
    await page.mouse.up();
    await page.waitForTimeout(250);
  };

  // ---- placed from the slide text
  t.ok(
    'slide-ng-drag="[x,y,w,h]" places the element',
    (await style('#d1', 'left')) === '100px' &&
      (await style('#d1', 'top')) === '200px' &&
      (await style('#d1', 'width')) === '160px' &&
      (await style('#d1', 'position')) === 'absolute',
  );
  t.ok(
    'a name takes its numbers from dragPos in the frontmatter',
    (await style('#d2', 'left')) === '600px' && (await style('#d2', 'width')) === '100px',
  );
  t.ok(
    '<slide-ng-drag pos> with automatic height',
    (await style('#d3', 'left')) === '500px' && (await style('#d3', 'height')) === 'auto',
  );
  t.ok(
    'a bare slide-ng-drag stays where the layout puts it until it is moved',
    (await style('#d5', 'position')) === '',
  );
  t.ok('no frame before something is selected', (await page.locator('#drag-frame').count()) === 0);

  // ---- moving
  await drag('#d1', 60, 30);
  const left = parseFloat(await style('#d1', 'left')),
    top = parseFloat(await style('#d1', 'top'));
  t.ok(
    'dragging moves the box by the mouse distance in slide pixels',
    Math.abs(left - (100 + 60 / k)) < 1.5 && Math.abs(top - (200 + 30 / k)) < 1.5,
    `${left},${top} scale ${k}`,
  );
  t.ok(
    'the dragged box is selected and has a frame with four corners and a rotate handle',
    (await page.locator('#drag-frame').count()) === 1 &&
      (await page.locator('.drag-handle').count()) === 4 &&
      (await page.locator('#drag-rotate').count()) === 1,
  );
  t.ok('a static build does not write anything', requests.length === 0, requests.join());

  // ---- arrow keys nudge while selected, and do not change slides
  await press(page, 'ArrowRight');
  await press(page, 'ArrowRight');
  await press(page, 'ArrowDown');
  const l2 = parseFloat(await style('#d1', 'left')),
    t2 = parseFloat(await style('#d1', 'top'));
  t.ok(
    'arrow keys nudge by 1px',
    Math.abs(l2 - left - 2) < 0.01 && Math.abs(t2 - top - 1) < 0.01,
    `${l2 - left},${t2 - top}`,
  );
  t.ok('and the deck stays on this slide', (await hud(page)).startsWith('slide 4/4'));
  await page.keyboard.press('Shift+ArrowLeft');
  await page.waitForTimeout(200);
  t.ok(
    'shift + arrow nudges by 10px',
    Math.abs(parseFloat(await style('#d1', 'left')) - (l2 - 10)) < 0.01,
  );

  // ---- resizing and rotating
  const se = await page.locator('.drag-handle[data-corner="se"]').boundingBox();
  await page.mouse.move(se.x + 6, se.y + 6);
  await page.mouse.down();
  await page.mouse.move(se.x + 6 + 40, se.y + 6 + 20, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const w = parseFloat(await style('#d1', 'width'));
  t.ok(
    'the south-east handle resizes',
    Math.abs(w - (160 + 40 / k)) < 2 && (await style('#d1', 'height')) !== 'auto',
    `${w}`,
  );
  const rot = await page.locator('#drag-rotate').boundingBox();
  await page.mouse.move(rot.x + 6, rot.y + 6);
  await page.mouse.down();
  const frame = await page.locator('#drag-frame').boundingBox();
  await page.mouse.move(frame.x + frame.width + 60, frame.y + frame.height / 2, { steps: 6 }); // to the right of the centre: about 90 degrees
  await page.mouse.up();
  await page.waitForTimeout(250);
  t.ok(
    'the rotate handle turns the box',
    /rotate\((8\d|9\d)deg\)/.test(await style('#d1', 'transform')),
    await style('#d1', 'transform'),
  );

  // ---- leaving the selection
  await page.mouse.click(30, 30);
  await page.waitForTimeout(200);
  t.ok('a click elsewhere clears the selection', (await page.locator('#drag-frame').count()) === 0);
  await press(page, 'ArrowLeft');
  t.ok('then the arrows move through the slides again', (await hud(page)).startsWith('slide 3/4'));
  await press(page, 'ArrowRight');
  await page.waitForTimeout(300);
  t.ok(
    'a move made in this visit is kept when the slide is shown again',
    Math.abs(parseFloat(await style('#d1', 'left')) - (l2 - 10)) < 0.01,
  );

  // ---- bare slide-ng-drag, component, arrow
  const natural = await page.locator('#d5').boundingBox();
  await drag('#d5', 40, 20);
  const moved = await page.locator('#d5').boundingBox();
  t.ok(
    'a bare slide-ng-drag starts from where it was and moves from there',
    Math.abs(moved.x - natural.x - 40) < 2 &&
      Math.abs(moved.y - natural.y - 20) < 2 &&
      (await style('#d5', 'position')) === 'absolute',
    `${moved.x - natural.x},${moved.y - natural.y}`,
  );
  await drag('#d3', -50, 40);
  t.ok(
    'the component moves and keeps its automatic height',
    Math.abs(parseFloat(await style('#d3', 'left')) - (500 - 50 / k)) < 1.5 &&
      (await style('#d3', 'height')) === 'auto',
  );

  const line = () =>
    page
      .locator('#d4 line')
      .first()
      .evaluate((l) => ['x1', 'y1', 'x2', 'y2'].map((a) => +l.getAttribute(a)).join());
  t.ok('the arrow is drawn between its points', (await line()) === '300,250,420,330', await line());
  const grab = await page.locator('#d4 .drag-grab').boundingBox();
  await page.mouse.move(grab.x + grab.width / 2, grab.y + grab.height / 2);
  await page.mouse.down();
  await page.mouse.move(grab.x + grab.width / 2 + 30, grab.y + grab.height / 2 + 30, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const [x1, y1] = (await line()).split(',').map(Number);
  t.ok(
    'dragging the line moves the whole arrow',
    Math.abs(x1 - (300 + 30 / k)) < 1.5 && Math.abs(y1 - (250 + 30 / k)) < 1.5,
    await line(),
  );
  t.ok('an arrow has a handle at each end', (await page.locator('.drag-end').count()) === 2);
  const end2 = await page.locator('.drag-end[data-end="2"]').boundingBox();
  const before = (await line()).split(',').map(Number);
  await page.mouse.move(end2.x + 6, end2.y + 6);
  await page.mouse.down();
  await page.mouse.move(end2.x + 6 + 20, end2.y + 6 - 20, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = (await line()).split(',').map(Number);
  t.ok(
    'an end handle moves only that end',
    after[0] === before[0] &&
      Math.abs(after[2] - (before[2] + 20 / k)) < 1.5 &&
      Math.abs(after[3] - (before[3] - 20 / k)) < 1.5,
    `${before} -> ${after}`,
  );

  // ---- a finger on a box or a handle moves it, it is not a swipe to another slide
  const fingerSwipe = (sel) =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      const at = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
      const event = (type, x) =>
        new TouchEvent(type, {
          touches: type === 'touchend' ? [] : [at(x)],
          changedTouches: [at(x)],
          bubbles: true,
        });
      el.dispatchEvent(event('touchstart', 300));
      el.dispatchEvent(event('touchmove', 700));
      el.dispatchEvent(event('touchend', 700));
    }, sel);
  await fingerSwipe('#d3');
  await fingerSwipe('#d4 .drag-grab');
  await fingerSwipe('.drag-end');
  await page.waitForTimeout(300);
  t.ok(
    'a finger drag on a box, an arrow or a handle stays on the slide',
    (await hud(page)).startsWith('slide 4/4'),
    await hud(page),
  );
  await fingerSwipe('h1');
  await page.waitForFunction(() => document.querySelector('#hud').innerText.includes('slide 3/'));
  t.ok('a finger swipe elsewhere still goes back', true);

  await page.close();
}
