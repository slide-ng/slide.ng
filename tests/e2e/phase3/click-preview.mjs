// The presenter's click preview (slide.ng's own): the current slide shows what later clicks show, greyed out,
// with the next click highlighted and a badge on each part; a click on one jumps there in every window. Deck: phase3/clicks.
export async function run({ t, open, press, hud, pathOf, windowGroup }) {
  const group = await windowGroup();
  const presenter = await open('/presenter/1', undefined, undefined, group);
  const viewer = await open('/1', undefined, undefined, group);
  await viewer.waitForTimeout(400);
  // The opacity changes with a short transition, which a window in the background does not run.
  await presenter.bringToFront();

  const main = '.grid-section.main #slide-content';
  const badges = () =>
    presenter.evaluate(
      (main) =>
        [...document.querySelectorAll(`${main} .slide-ng-ghost-badge`)]
          .map((b) => b.textContent.trim())
          .sort((a, b) => a - b)
          .join(','),
      main,
    );
  const opacity = (page, id) =>
    page.evaluate((id) => +getComputedStyle(document.getElementById(id)).opacity, id);
  const state = (selector) =>
    presenter.evaluate(
      ([main, selector]) => {
        const el = document.querySelector(`${main} ${selector}`);
        return {
          ahead: el.classList.contains('slide-ng-click-ahead'),
          next: el.classList.contains('slide-ng-click-next'),
          at: el.getAttribute('data-slide-ng-click-at'),
          opacity: +getComputedStyle(el).opacity,
        };
      },
      [main, selector],
    );

  t.ok(
    'click preview: off by default, nothing upcoming is drawn',
    (await badges()) === '' && (await opacity(presenter, 'p1')) === 0,
    await badges(),
  );
  await press(presenter, 'u', 400);
  t.ok(
    'click preview: u turns it on and the bar button shows it',
    (await presenter.locator('#nav-click-preview').getAttribute('title')) ===
      'Hide upcoming clicks',
  );
  t.ok(
    'click preview: each part not shown yet has a badge with its click',
    (await badges()) === '1,2,2,3,4,5,5',
    await badges(),
  );
  // A part that a click animation preset moves while hidden is drawn at its place.
  const offset = (page, scope = '') =>
    page.evaluate((scope) => {
      const s = getComputedStyle(document.querySelector(`${scope} #p2`));
      return `${s.translate} ${s.scale}`;
    }, scope);
  t.ok(
    'click preview: a part with a preset offset is drawn at its place (the audience keeps the offset)',
    (await offset(presenter, main)) === 'none none' && (await offset(viewer)) === '0px 20px 0.9',
    `${await offset(presenter, main)} / ${await offset(viewer)}`,
  );
  // A part hidden with `transform: scale(0)` (a deck's own click animation) still has a ghost and a badge.
  const shrunk = await presenter.evaluate((main) => {
    const el = document.querySelector(`${main} #p2b`);
    const r = el.getBoundingClientRect();
    return {
      ahead: el.classList.contains('slide-ng-click-ahead'),
      transform: getComputedStyle(el).transform,
      size: r.width > 0 && r.height > 0,
      badge: !!document.querySelector(`${main} .slide-ng-ghost-badge[data-click="2"]`),
    };
  }, main);
  const audience = await viewer.evaluate(
    () => getComputedStyle(document.getElementById('p2b')).transform,
  );
  t.ok(
    'click preview: a part hidden with transform: scale(0) is drawn as a ghost with a badge',
    shrunk.ahead &&
      shrunk.transform === 'none' &&
      shrunk.size &&
      shrunk.badge &&
      audience === 'matrix(0, 0, 0, 0, 0, 0)',
    `${JSON.stringify(shrunk)} / ${audience}`,
  );
  // The next click's colour follows the theme's primary colour, which themeConfig sets on body.
  const nextColour = () =>
    presenter.evaluate(
      (main) => [
        getComputedStyle(document.querySelector(`${main} #p1`)).outlineColor,
        getComputedStyle(document.querySelector(`${main} .slide-ng-ghost-badge-next`))
          .backgroundColor,
      ],
      main,
    );
  await presenter.evaluate(() =>
    document.body.style.setProperty('--slidev-theme-primary', 'rgb(200, 30, 40)'),
  );
  await presenter.waitForTimeout(800); // the part's colours change with a transition
  t.ok(
    "click preview: the next click's outline and badge follow the theme's primary colour",
    (await nextColour()).join() === 'rgb(200, 30, 40),rgb(200, 30, 40)',
    (await nextColour()).join(),
  );
  await presenter.evaluate(() => document.body.style.removeProperty('--slidev-theme-primary'));
  // Right to left: the badge sits at the part's inline start, its right edge.
  const badgeSide = () =>
    presenter.evaluate((main) => {
      const part = document.querySelector(`${main} #p1`).getBoundingClientRect();
      const b = document
        .querySelector(`${main} .slide-ng-ghost-badge[data-click="1"]`)
        .getBoundingClientRect();
      const centre = b.left + b.width / 2;
      return Math.abs(centre - part.right) < b.width
        ? 'right'
        : Math.abs(centre - part.left) < b.width
          ? 'left'
          : `${centre} of ${part.left}-${part.right}`;
    }, main);
  const relayout = async () => {
    // A new size of the window measures the badges again.
    const size = presenter.viewportSize();
    await presenter.setViewportSize({ width: size.width - 20, height: size.height });
    await presenter.waitForTimeout(300);
    await presenter.setViewportSize(size);
    await presenter.waitForTimeout(300);
  };
  const ltr = await badgeSide();
  await presenter.evaluate(() => (document.documentElement.dir = 'rtl'));
  await relayout();
  const rtl = await badgeSide();
  await presenter.evaluate(() => document.documentElement.removeAttribute('dir'));
  await relayout();
  t.ok(
    'click preview: badges sit at the inline start, the right edge in a right-to-left deck',
    ltr === 'left' && rtl === 'right' && (await badgeSide()) === 'left',
    `${ltr} ${rtl}`,
  );
  // Content that grows later (a picture or a font arriving) moves the badges with it.
  const badgeTop = (n) =>
    presenter
      .locator(`${main} .slide-ng-ghost-badge[data-click="${n}"]`)
      .first()
      .evaluate((b) => parseFloat(b.style.top));
  const before = await badgeTop(2);
  await presenter.evaluate((main) => {
    document.querySelector(`${main} #p1`).style.height = '120px';
  }, main);
  await presenter.waitForTimeout(300);
  const after = await badgeTop(2);
  await presenter.evaluate((main) => {
    document.querySelector(`${main} #p1`).style.height = '';
  }, main);
  await presenter.waitForTimeout(300);
  t.ok(
    'click preview: badges follow content that changes size later',
    after > before + 30 && (await badgeTop(2)) === before,
    `${before} -> ${after}`,
  );
  const p1 = await state('#p1'),
    p2 = await state('#p2'),
    item = await state('li:nth-child(2)');
  t.ok(
    'click preview: the part of the next click is highlighted',
    p1.ahead && p1.next && p1.at === '1' && p1.opacity > 0.5 && p1.opacity < 1,
    JSON.stringify(p1),
  );
  t.ok(
    'click preview: parts of later clicks are greyed out',
    p2.ahead && !p2.next && p2.at === '2' && p2.opacity > 0 && p2.opacity < 0.5,
    JSON.stringify(p2),
  );
  t.ok(
    'click preview: click list items have their own clicks',
    item.at === '4' && item.opacity > 0 && item.opacity < 0.5,
    JSON.stringify(item),
  );
  const hidden = await state('#ph');
  t.ok(
    'click preview: a part that a later click hides stays as it is, with its badge',
    hidden.ahead && hidden.at === '5' && hidden.opacity === 1,
    JSON.stringify(hidden),
  );
  t.ok(
    'click preview: the audience window is unchanged',
    (await opacity(viewer, 'p1')) === 0 &&
      (await viewer.locator('.slide-ng-click-ahead, .slide-ng-ghost-badge').count()) === 0,
  );
  t.ok(
    'click preview: the next-step pane is unchanged',
    (await presenter.locator('#next-canvas .slide-ng-click-ahead').count()) === 0,
  );

  await press(presenter, 'ArrowRight', 400);
  const shown = await state('#p1');
  t.ok(
    'click preview: a part on screen looks normal and the next click moves on',
    !shown.ahead && shown.opacity === 1 && (await state('#p2')).next,
    JSON.stringify(shown),
  );

  // ---- clicking a greyed-out part or a badge goes there in every window
  await presenter.locator(`${main} li`).nth(1).click();
  await presenter.waitForTimeout(400);
  t.ok(
    'click preview: a click on a greyed-out part jumps to its click in every window',
    (await hud(presenter)) === 'slide 1/2 clicks 4/6' &&
      (await hud(viewer)) === 'slide 1/2 clicks 4/6',
    `${await hud(presenter)} / ${await hud(viewer)}`,
  );
  await presenter.locator(`${main} .slide-ng-ghost-badge[data-click="5"]`).first().click();
  await presenter.waitForTimeout(400);
  t.ok(
    'click preview: a click on a badge jumps to its click in every window',
    (await hud(viewer)) === 'slide 1/2 clicks 5/6' && (await opacity(viewer, 'pr')) === 1,
    await hud(viewer),
  );
  t.ok(
    'click preview: a range on screen is marked where it ends',
    (await badges()) === '6' && (await state('#pr')).next,
    await badges(),
  );

  // ---- remembered, and the button turns it off
  await presenter.reload();
  await presenter.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await presenter.waitForTimeout(300);
  t.ok('click preview: stays on after a reload', (await badges()) === '6', await badges());
  await presenter.locator('#nav-click-preview').click();
  await presenter.waitForTimeout(300);
  t.ok(
    'click preview: the bar button turns it off and cleans the slide',
    (await badges()) === '' &&
      (await presenter.locator(`${main} .slide-ng-click-ahead`).count()) === 0,
  );
  await presenter.reload();
  await presenter.waitForFunction(() =>
    /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await presenter.waitForTimeout(300);
  t.ok('click preview: stays off after a reload', (await badges()) === '');
  await presenter.locator('#nav-click-preview').click();

  // ---- the other kinds of clicks: code steps, switch, magic-move, marks, motion
  await press(presenter, 'ArrowDown', 600);
  const kinds = await presenter.evaluate((main) => {
    const at = (sel) =>
      document.querySelector(`${main} ${sel}`)?.getAttribute('data-slide-ng-click-at');
    return [
      at('.slidev-code-wrapper:not(.slidev-code-magic-move)'),
      at('slide-ng-switch'),
      at('.slidev-code-magic-move'),
      at('#mk'),
      at('#mo'),
    ].join(',');
  }, main);
  t.ok(
    'click preview: code steps, switch, magic-move, marks and motion are marked',
    kinds === '1,3,5,6,7',
    kinds,
  );
  await press(presenter, 'ArrowRight', 400);
  await press(presenter, 'ArrowRight', 400);
  t.ok(
    'click preview: a part that changes on each click is marked with the next one',
    (await badges()) === '3,5,6,7,7' &&
      (await presenter
        .locator(`${main} slide-ng-switch`)
        .evaluate((e) => e.classList.contains('slide-ng-click-next'))),
    await badges(),
  );

  // ---- while drawing, a tap on a badge is the pen's
  await presenter.locator('#nav-drawing').click();
  await presenter.waitForTimeout(300);
  const box = await presenter
    .locator(`${main} .slide-ng-ghost-badge[data-click="5"]`)
    .boundingBox();
  await presenter.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await presenter.waitForTimeout(400);
  t.ok(
    'click preview: with drawing on, clicking a badge does not change the click',
    (await hud(presenter)) === 'slide 2/2 clicks 2/7' &&
      (await hud(viewer)) === 'slide 2/2 clicks 2/7',
    await hud(presenter),
  );
  await presenter.locator('#nav-drawing').click();
  await presenter.waitForTimeout(300);

  // ---- a link inside a greyed-out part jumps to its click instead of being followed
  await presenter.locator(`${main} #plink-a`).click();
  await presenter.waitForTimeout(400);
  t.ok(
    'click preview: a link in a greyed-out part is not followed, the click is reached',
    pathOf(presenter) === '/presenter/2' &&
      (await hud(presenter)) === 'slide 2/2 clicks 7/7' &&
      (await hud(viewer)) === 'slide 2/2 clicks 7/7',
    `${pathOf(presenter)} ${await hud(presenter)}`,
  );
  await group.close();
}
