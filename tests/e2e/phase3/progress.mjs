// The headmatter `progressBar` (with `minutes`): the bar on the slide, its clicks, the timer minutes and print pages.
export async function run({ t, base, browser, open, press, windowGroup }) {
  const group = await windowGroup();
  const viewer = await open('/2', undefined, undefined, group);
  const value = (page, sel = '#slide-content .deck-progress-bar') =>
    page.locator(sel).first().getAttribute('aria-valuenow');
  t.ok(
    'progressBar draws a bar on the slide: slide 2 of 4 is a third of the way',
    (await value(viewer)) === '33.33',
    await value(viewer),
  );
  const look = await viewer.locator('#slide-content .deck-progress-bar').evaluate((e) => ({
    bottom: e.getBoundingClientRect().bottom,
    canvas: e.closest('.canvas').getBoundingClientRect().bottom,
    color: getComputedStyle(e.firstElementChild).backgroundColor,
  }));
  t.ok(
    'the bar sits on the bottom edge in the colour of the headmatter',
    Math.abs(look.bottom - look.canvas) < 1 && look.color === 'rgb(225, 29, 72)',
    JSON.stringify(look),
  );
  t.ok(
    'the bar is named for screen readers',
    (await viewer.locator('#slide-content .deck-progress-bar').getAttribute('aria-label')) ===
      'Progress through the slides',
  );
  // Forced colours (Windows high contrast) would paint the fill with the page colour: it gets Highlight instead.
  await viewer.emulateMedia({ forcedColors: 'active' });
  await viewer.waitForTimeout(500); // the fill's colour changes with a transition
  const forced = await viewer.locator('#slide-content .deck-progress-bar').evaluate((e) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'forced-color-adjust: none; background: Highlight';
    document.body.append(probe);
    const highlight = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return { fill: getComputedStyle(e.firstElementChild).backgroundColor, highlight };
  });
  await viewer.emulateMedia({ forcedColors: 'none' });
  t.ok(
    'in forced colours the fill is drawn in the highlight colour',
    forced.fill === forced.highlight,
    JSON.stringify(forced),
  );
  await press(viewer, 'ArrowRight', 400);
  t.ok(
    'a click fills part of the way to the next slide',
    (await value(viewer)) === '44.44',
    await value(viewer),
  );
  t.ok(
    'no minutes while the timer is stopped',
    (await viewer.locator('.slide-ng-progress-minutes').count()) === 0,
  );

  // The presenter starts the countdown (10 minutes); the viewer's bar shows the minutes left.
  const presenter = await open('/presenter/2?clicks=1', undefined, undefined, group);
  await presenter.waitForTimeout(400);
  t.ok(
    'the presenter page draws the bar on its main slide and on the next step',
    (await value(presenter)) === '44.44' &&
      (await value(presenter, '#next-canvas .deck-progress-bar')) === '55.56',
    `${await value(presenter)} ${await value(presenter, '#next-canvas .deck-progress-bar')}`,
  );
  await presenter.locator('#timer').hover();
  await presenter.locator('#timer-toggle').click();
  await viewer.waitForTimeout(600);
  const minutes = () =>
    viewer
      .locator('#slide-content .slide-ng-progress-minutes')
      .innerText()
      .catch(() => '');
  t.ok(
    'minutes: true shows the minutes left of the countdown on the viewer',
    (await minutes()) === '10 min left',
    await minutes(),
  );
  await presenter.locator('#timer').hover();
  await presenter.locator('#timer-reset').click();
  await viewer.waitForTimeout(400);
  t.ok('a reset timer hides the minutes again', (await minutes()) === '');
  await group.close();

  // Print pages carry the bar of their own slide and click.
  const print = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await print.goto(`${base}/print?print=clicks`);
  await print.waitForSelector('[data-slide-ng-print="ready"]');
  const pages = await print
    .locator('.print-slide-container')
    .evaluateAll((l) =>
      l.map(
        (e) => `${e.id}:${e.querySelector('.deck-progress-bar')?.getAttribute('aria-valuenow')}`,
      ),
    );
  t.ok(
    'each print page has the bar of its slide and click',
    pages.join() === '001-01:0,002-01:33.33,002-02:44.44,002-03:55.56,003-01:66.67,004-01:100',
    pages.join(),
  );
  // A slide can place its own bar.
  const own = await print.locator('#own-bar').evaluate((e) => ({
    value: e.getAttribute('aria-valuenow'),
    height: e.getBoundingClientRect().height,
    position: getComputedStyle(e).position,
  }));
  t.ok(
    '<slide-ng-progress-bar> in a slide takes its options from attributes',
    own.value === '66.67' && Math.abs(own.height - 10) < 0.5 && own.position === 'relative',
    JSON.stringify(own),
  );
  await print.close();
}
