// Headmatter `canvasWidth`, `aspectRatio`, `zoom`, `routerMode: hash` and the four layer components (the layout deck).
export async function run({ t, open, press, hud }) {
  const page = await open('/#/1', { width: 640, height: 480 });
  t.ok(
    'routerMode: hash puts the slide after #',
    /\/#\/1(\?|$)/.test(page.url()) && (await hud(page)).startsWith('slide 1/2'),
    page.url(),
  );
  const canvas = await page.locator('.canvas').boundingBox();
  t.ok(
    'canvasWidth and aspectRatio set the canvas: 640x480 fits a 640x480 window exactly',
    Math.abs(canvas.width - 640) < 1 && Math.abs(canvas.height - 480) < 1,
    `${canvas.width}x${canvas.height}`,
  );
  const probe = () => page.locator('#probe').boundingBox();
  t.ok(
    'zoom: 0.5 in the headmatter shrinks the slide content',
    Math.abs((await probe()).width - 50) < 1,
    String((await probe()).width),
  );
  await press(page, 'ArrowDown');
  t.ok('the hash follows the slide', /\/#\/2(\?|$)/.test(page.url()), page.url());
  t.ok(
    'zoom: 1 in the slide frontmatter wins over the headmatter',
    Math.abs((await probe()).width - 100) < 1,
    String((await probe()).width),
  );

  // ---- custom-nav-controls: a button from layers/ at the end of the bar, after the slide counter
  const barOrder = await page
    .locator('nav #nav-counter')
    .evaluate(
      (c) => c.nextElementSibling?.id + '>' + c.nextElementSibling?.querySelector('button')?.id,
    );
  t.ok(
    'a button of the custom-nav-controls layer is in the bar, after the counter',
    barOrder === 'custom-nav-controls>custom-next',
    barOrder,
  );
  await press(page, 'ArrowUp');
  await page.locator('nav').first().hover();
  await page.locator('#custom-next').click();
  await page.waitForTimeout(300);
  t.ok(
    'the custom button works (it goes to slide 2)',
    (await hud(page)).startsWith('slide 2/2'),
    await hud(page),
  );

  // ---- layers
  const ids = await page.locator('#gt, #gb, #st, #sb').evaluateAll((l) =>
    l
      .map((e) => e.id)
      .sort()
      .join(),
  );
  t.ok('the four layers are drawn', ids === 'gb,gt,sb,st', ids);
  t.ok(
    'a slide layer knows its slide',
    (await page.locator('#st').getAttribute('data-slide')) === '2',
  );
  const order = await page.evaluate(() => {
    const canvas = document.querySelector('.canvas');
    const index = (sel) =>
      [...canvas.children].findIndex((c) => c.contains(document.querySelector(sel)));
    return { gb: index('#gb'), slide: index('#probe'), gt: index('#gt') };
  });
  t.ok(
    'global-bottom is under the slide and global-top over it',
    order.gb < order.slide && order.slide < order.gt,
    JSON.stringify(order),
  );
  const slideBox = await page
    .locator('slide-002')
    .evaluate((e) =>
      e.querySelector('#sb') && e.querySelector('#st')
        ? [...e.children].map((c) => c.localName).join()
        : 'missing',
    );
  t.ok(
    'slide-top and slide-bottom are inside the slide, around the layout',
    /^app-slide-layer,sn-default,app-slide-layer$/.test(slideBox),
    slideBox,
  );
  const g = await page
    .locator('#gt')
    .evaluate((e) => ({ x: e.getBoundingClientRect().left, y: e.getBoundingClientRect().top }));
  await page.mouse.click(g.x + 5, g.y + 5);
  t.ok('a click on a layer does not move the slide', (await hud(page)).startsWith('slide 2/2'));
  await page.close();

  // the presenter's next-step preview draws the global layers, like the slide itself
  const presenter = await open('/#/presenter/1', { width: 1280, height: 720 });
  await presenter.waitForSelector('#next-canvas');
  const nextLayers = await presenter
    .locator('#next-canvas #gt, #next-canvas #gb')
    .evaluateAll((l) =>
      l
        .map((e) => e.id)
        .sort()
        .join(),
    );
  t.ok('the next-step preview shows the global layers', nextLayers === 'gb,gt', nextLayers);
  const lastInBar = await presenter
    .locator('nav')
    .first()
    .evaluate((n) => n.firstElementChild.lastElementChild?.id);
  t.ok(
    'the presenter bar ends with the custom-nav-controls layer',
    lastInBar === 'custom-nav-controls' &&
      (await presenter.locator('nav #custom-next').count()) === 1,
    lastInBar,
  );
  await presenter.close();

  // a reload on a deep link works in hash mode (the server only knows /)
  const deep = await open('/#/2', { width: 640, height: 480 });
  t.ok('a link with #/2 opens slide 2', (await hud(deep)).startsWith('slide 2/2'), await hud(deep));
  await deep.close();
}
