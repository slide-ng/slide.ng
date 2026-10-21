// The presenter page, the notes page, the timer and the layouts.
export async function run({ t, open, press, hud, until, pathOf, windowGroup }) {
  const group = await windowGroup();
  const presenter = await open('/presenter/2', undefined, undefined, group);
  const viewer = await open('/1', undefined, undefined, group);
  await viewer.waitForTimeout(500);

  t.ok(
    '/presenter/2 shows slide 2 on the presenter page',
    pathOf(presenter) === '/presenter/2' && (await hud(presenter)) === 'slide 2/4 clicks 0/2',
    await hud(presenter),
  );
  t.ok(
    'a viewer that opens later joins the presenter (hello)',
    (await hud(viewer)) === 'slide 2/4 clicks 0/2',
    await hud(viewer),
  );

  // ---- presenter drives, viewer follows
  await press(presenter, 'ArrowRight', 400);
  t.ok(
    'presenter click is followed by the viewer',
    (await hud(viewer)) === 'slide 2/4 clicks 1/2',
    await hud(viewer),
  );
  const visible = (page, id) =>
    page.evaluate((id) => getComputedStyle(document.getElementById(id)).opacity !== '0', id);
  t.ok(
    'the viewer shows the first click',
    (await visible(viewer, 'c1')) && !(await visible(viewer, 'c2')),
  );
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 500);
  t.ok(
    'presenter moves to slide 3 and the viewer follows',
    (await hud(presenter)).startsWith('slide 3/4') &&
      (await hud(viewer)).startsWith('slide 3/4') &&
      pathOf(viewer) === '/3',
    await hud(viewer),
  );
  await press(presenter, 'ArrowLeft', 500);
  t.ok(
    'going back lands on the last click of slide 2 in both',
    (await hud(presenter)) === 'slide 2/4 clicks 2/2' &&
      (await hud(viewer)) === 'slide 2/4 clicks 2/2',
    await hud(viewer),
  );
  t.ok('the viewer address stays the play route', pathOf(viewer) === '/2');

  // ---- a viewer on this machine may drive too
  await press(viewer, 'ArrowLeft', 500);
  t.ok(
    'a local viewer moves the presenter back',
    (await hud(presenter)) === 'slide 2/4 clicks 1/2',
    await hud(presenter),
  );

  // ---- next preview
  const nextOf = async (id) =>
    presenter.evaluate((id) => {
      const el = document.querySelector(`#next-canvas ${id}`);
      return el ? getComputedStyle(el).opacity !== '0' : null;
    }, id);
  t.ok('the next preview shows the next click of this slide', (await nextOf('#c2')) === true);
  t.ok(
    'screen readers skip the next preview, and the panes are named regions',
    (await presenter.locator('#next-canvas').getAttribute('aria-hidden')) === 'true' &&
      (await presenter
        .locator('[role=region]')
        .evaluateAll((l) => l.map((e) => e.getAttribute('aria-label')).join())) ===
        'Current slide,Next step,Notes',
  );
  await press(presenter, 'ArrowRight', 400);
  t.ok(
    'at the last click the next preview shows the next slide',
    (await presenter.locator('#next-canvas').innerText()).includes('Third'),
  );
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 400);
  t.ok(
    'on the last slide the next area says it is the end',
    (await presenter.locator('app-next-preview').innerText()).includes('End of the presentation'),
  );
  await press(presenter, 'ArrowLeft', 300);
  await press(presenter, 'ArrowLeft', 300);
  await press(presenter, 'ArrowLeft', 300);
  t.ok(
    'back on slide 2 click 1',
    (await hud(presenter)) === 'slide 2/4 clicks 1/2',
    await hud(presenter),
  );

  // ---- notes
  const notes = presenter.locator('app-note-display');
  t.ok(
    'notes are rendered with their text',
    (await notes.innerText()).includes('Before the clicks.') &&
      (await notes.innerText()).includes('Shown after the second click.'),
  );
  t.ok(
    'the marker of the current click is active',
    (await presenter.locator('.slidev-note-click-mark-active').getAttribute('data-clicks')) === '1',
  );
  t.ok(
    'text of other clicks is dimmed',
    await presenter.evaluate(() =>
      [...document.querySelectorAll('.slidev-note-fade')].some((e) =>
        e.textContent.includes('second click'),
      ),
    ),
  );
  const hudIs = (page, text) =>
    until(page, (x) => document.querySelector('#hud')?.innerText.trim() === x, text);
  await presenter.locator('.slidev-note-click-mark[data-clicks="2"]').dblclick();
  await hudIs(presenter, 'slide 2/4 clicks 2/2');
  await hudIs(viewer, 'slide 2/4 clicks 2/2');
  t.ok(
    'double click on a marker jumps to that click',
    (await hud(presenter)) === 'slide 2/4 clicks 2/2' &&
      (await hud(viewer)) === 'slide 2/4 clicks 2/2',
    await hud(presenter),
  );
  await press(presenter, 'ArrowUp', 400);
  t.ok(
    'a slide without notes says so',
    (await notes.innerText()).includes('No notes for Slide 1.') ||
      (await notes.innerText()).includes('Notes of slide one.'),
  );
  await press(presenter, 'ArrowDown', 400);

  // ---- slider
  await presenter.locator('app-clicks-slider .clicks-cell', { hasText: '0' }).first().click();
  await hudIs(presenter, 'slide 2/4 clicks 0/2');
  t.ok(
    'the clicks slider goes to a click',
    (await hud(presenter)) === 'slide 2/4 clicks 0/2',
    await hud(presenter),
  );

  // ---- notes font size
  const fs = () =>
    presenter
      .locator('app-note-display')
      .evaluate((e) => getComputedStyle(e.parentElement).fontSize);
  const before = parseFloat(await fs());
  // WCAG 2.5.8: the small buttons under the notes are at least 24 by 24 pixels.
  const sizes = await presenter
    .locator('#notes-bigger, #notes-smaller')
    .evaluateAll((l) => l.map((e) => e.getBoundingClientRect()).map((r) => [r.width, r.height]));
  t.ok(
    'the notes buttons are at least 24 by 24 pixels',
    sizes.length === 2 && sizes.flat().every((n) => n >= 24),
    JSON.stringify(sizes),
  );
  await presenter.locator('#notes-bigger').click();
  await presenter.waitForTimeout(150);
  t.ok('the notes font grows', parseFloat(await fs()) > before);
  await presenter.locator('#notes-smaller').click();

  // ---- timer (countdown from 10 minutes)
  const clock = () => presenter.locator('#timer-text').innerText();
  t.ok(
    'countdown shows the duration before it starts',
    (await clock()).replace(/\s/g, '') === '10:00',
    await clock(),
  );
  await presenter.locator('#timer').hover();
  await presenter.locator('#timer-toggle').click();
  await presenter.waitForTimeout(1300);
  t.ok(
    'the timer counts down while running',
    /^9:5\d$/.test((await clock()).replace(/\s/g, '')),
    await clock(),
  );
  const notesWin = await open('/notes', undefined, undefined, group);
  await notesWin.waitForTimeout(500);
  t.ok(
    'the notes page shows the same running time through the shared state',
    /\d/.test(await notesWin.locator('#notes-counter').innerText()),
  );
  await notesWin.emulateMedia({ colorScheme: 'dark' });
  await notesWin.waitForTimeout(150);
  t.ok(
    'the notes page follows dark mode',
    await notesWin.evaluate(() => document.documentElement.classList.contains('dark')),
  );
  await notesWin.emulateMedia({ colorScheme: 'light' });
  await presenter.locator('#timer').hover();
  await presenter.locator('#timer-toggle').click();
  const paused = await clock();
  await presenter.waitForTimeout(700);
  t.ok('pause freezes the clock', (await clock()) === paused, `${paused} / ${await clock()}`);
  await presenter.locator('#timer').hover();
  await presenter.locator('#timer-reset').click();
  await presenter.waitForTimeout(150);
  t.ok(
    'reset goes back to the full duration',
    (await clock()).replace(/\s/g, '') === '10:00',
    await clock(),
  );
  // The buttons show only on hover or focus; a touch screen cannot hover (a phone as the remote), so there they always show.
  const buttonsOpacity = (page) =>
    page.locator('#timer .timer-buttons').evaluate((e) => getComputedStyle(e).opacity);
  await presenter.mouse.move(5, 5);
  await presenter.evaluate(() => document.activeElement?.blur());
  const desktopOpacity = await buttonsOpacity(presenter);
  const phone = await windowGroup({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 844, height: 390 },
  });
  const phonePresenter = await open('/presenter/2', { width: 844, height: 390 }, undefined, phone);
  const phoneOpacity = await buttonsOpacity(phonePresenter);
  t.ok(
    'the timer buttons are hidden until hover with a mouse, and always shown on a touch screen',
    desktopOpacity === '0' && phoneOpacity === '1',
    `${desktopOpacity} / ${phoneOpacity}`,
  );
  await phone.close();

  // ---- notes page follows the presenter
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 500);
  t.ok(
    'the notes page follows the presenter',
    (await notesWin.locator('#notes-counter').innerText()).replace(/\s/g, '').startsWith('2/4') &&
      (await notesWin.locator('app-note-display').innerText()).includes(
        'Shown after the first click.',
      ),
    await notesWin.locator('#notes-counter').innerText(),
  );
  t.ok(
    'the notes page has no slide on it',
    (await notesWin.locator('#slide-content').count()) === 0,
  );

  // ---- layouts
  const layout = () => presenter.locator('.grid-container').getAttribute('class');
  t.ok(
    'layout 1 is the default',
    (await layout()).includes('layout1') &&
      (await presenter.locator('#nav-layout-no').innerText()) === '1',
  );
  const areas = async () =>
    presenter.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const main = r('.grid-section.main'),
        note = r('.grid-section.note'),
        next = r('.grid-section.next');
      return { main, note, next };
    });
  let a = await areas();
  t.ok(
    'layout 1 (wide window): slide on the left, next and notes stacked on the right',
    a.main.x < a.next.x && a.next.y < a.note.y,
  );
  await presenter.locator('#nav-layout').click();
  await presenter.waitForTimeout(150);
  a = await areas();
  t.ok(
    'layout 2: notes left, slide above next on the right',
    (await layout()).includes('layout2') && a.note.x < a.main.x && a.main.y < a.next.y,
  );
  await presenter.locator('#nav-layout').click();
  await presenter.waitForTimeout(150);
  a = await areas();
  t.ok(
    'layout 3: notes above slide on the left, next on the right',
    (await layout()).includes('layout3') && a.note.y < a.main.y && a.main.x < a.next.x,
  );
  await presenter.reload();
  await presenter.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  t.ok('the layout is remembered after a reload', (await layout()).includes('layout3'));
  await presenter.locator('#nav-layout').click();
  await presenter.waitForTimeout(150);

  // ---- leaving and entering presenter mode
  await presenter.locator('#nav-play').click();
  await presenter.waitForTimeout(400);
  t.ok(
    'the play-mode button goes to the play page at the same slide and click',
    /^\/2$/.test(pathOf(presenter)) && (await presenter.locator('#nav-presenter').count()) === 1,
    pathOf(presenter),
  );
  await presenter.locator('#nav-presenter').click();
  await presenter.waitForTimeout(400);
  t.ok('the presenter button comes back', pathOf(presenter) === '/presenter/2');
  await presenter
    .locator('.grid-section.main')
    .click({ button: 'right', position: { x: 60, y: 60 } });
  await presenter.waitForTimeout(150);
  const labels = await presenter.locator('#context-menu .slidev-menu-item').allInnerTexts();
  t.ok(
    'the context menu offers to exit presenter mode',
    labels.some((l) => l.includes('Exit Presenter Mode')),
    labels.join('|'),
  );
  await presenter
    .locator('#context-menu', { hasText: 'Exit Presenter Mode' })
    .getByText('Exit Presenter Mode')
    .click();
  await presenter.waitForTimeout(400);
  t.ok('the menu entry leaves presenter mode', pathOf(presenter) === '/2', pathOf(presenter));
  await presenter.keyboard.press('Escape');
  await group.close();
}
