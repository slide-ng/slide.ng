// Every layout renders: one slide per layout in showcase/slides.md.
export async function run({ t, open, style }) {
  // [slide number, layout, a check that only this layout passes]
  const checks = [
    [
      1,
      'cover',
      async (p) =>
        (await style(p, 'sn-cover', 'display')) === 'grid' &&
        (await style(p, 'sn-cover h1', 'fontSize')) === '60px',
    ],
    [2, 'intro', async (p) => (await p.locator('sn-intro > .my-auto h1').count()) === 1],
    [3, 'default', async (p) => (await style(p, 'sn-default', 'paddingLeft')) === '56px'],
    [
      4,
      'center',
      async (p) =>
        (await style(p, 'sn-center', 'display')) === 'grid' &&
        (await style(p, 'sn-center', 'placeContent')).includes('center'),
    ],
    [
      5,
      'fact',
      async (p) =>
        (await style(p, 'sn-fact h1', 'fontSize')) === '96px' &&
        (await style(p, 'sn-fact', 'textAlign')) === 'center',
    ],
    [
      6,
      'full',
      async (p) =>
        (await style(p, 'sn-full', 'paddingLeft')) === '56px' &&
        (await style(p, 'sn-full', 'paddingTop')) === '40px',
    ],
    [
      7,
      'image',
      async (p) =>
        (await style(p, 'sn-image', 'backgroundImage')).includes('data:image/svg+xml') &&
        (await style(p, 'sn-image', 'backgroundSize')) === 'cover',
    ],
    [
      8,
      'image-left',
      async (p) =>
        (
          await p
            .locator('sn-image-left > div')
            .first()
            .evaluate((e) => getComputedStyle(e).backgroundImage)
        ).includes('svg') &&
        (await p.locator('sn-image-left > .slidev-layout.content-class').count()) === 1,
    ],
    [
      9,
      'image-right',
      async (p) =>
        (
          await p
            .locator('sn-image-right > div')
            .last()
            .evaluate((e) => getComputedStyle(e).backgroundImage)
        ).includes('svg') && (await p.locator('sn-image-right > .content-class').count()) === 1,
    ],
    [
      10,
      'iframe',
      async (p) =>
        ((await p.locator('sn-iframe iframe').getAttribute('src')) ?? '').startsWith(
          'data:text/html',
        ) && (await p.locator('iframe').boundingBox()).width > 900,
    ],
    [
      11,
      'iframe-left',
      async (p) =>
        (await p.locator('sn-iframe-left iframe').boundingBox()).width > 400 &&
        (await p.locator('sn-iframe-left .content-class').count()) === 1,
    ],
    [
      12,
      'iframe-right',
      async (p) =>
        (await p.locator('sn-iframe-right iframe').boundingBox()).width > 400 &&
        (await p.locator('sn-iframe-right .content-class').count()) === 1 &&
        // `scale: 0.8` scales the frame only: attributify does not make `[scale~="0.8"]` of it.
        (await style(p, 'sn-iframe-right', 'transform')) === 'none' &&
        (await p.locator('sn-iframe-right h1').boundingBox()).width > 200,
    ],
    [13, 'none', async (p) => (await p.locator('sn-none .slidev-layout').count()) === 0],
    [14, 'quote', async (p) => (await style(p, 'sn-quote', 'display')) === 'grid'],
    [
      15,
      'section',
      async (p) =>
        (await style(p, 'sn-section h1', 'fontSize')) === '60px' &&
        (await style(p, 'sn-section h1', 'fontWeight')) === '500',
    ],
    [
      16,
      'statement',
      async (p) =>
        (await style(p, 'sn-statement h1', 'fontWeight')) === '700' &&
        (await style(p, 'sn-statement', 'textAlign')) === 'center',
    ],
    [
      17,
      'two-cols',
      async (p) => {
        const a = await p.locator('.col-left').boundingBox(),
          b = await p.locator('.col-right').boundingBox();
        return b.x > a.x + 300 && Math.abs(a.y - b.y) < 2;
      },
    ],
    [
      18,
      'two-cols-header',
      async (p) => {
        const [l, r, bottom] = await Promise.all(
          ['.col-left', '.col-right', '.col-bottom'].map((s) => p.locator(s).boundingBox()),
        );
        return r.x > l.x + 300 && bottom.y > l.y;
      },
    ],
    [
      19,
      'end',
      async (p) =>
        (await p.locator('sn-end').innerText()).trim() === 'END' &&
        (await style(p, 'sn-end', 'backgroundColor')) === 'rgb(0, 0, 0)',
    ],
  ];
  for (const [no, layout, check] of checks) {
    const page = await open(`/${no}`);
    const one = (await page.locator(`sn-${layout}`).count()) === 1;
    t.ok(`layout ${layout} (slide ${no}) renders its element`, one);
    t.ok(`layout ${layout} has its own look`, one && (await check(page)));
    await page.close();
  }

  // Text of the headings, to make sure slide numbers still match the deck.
  const page = await open('/8');
  t.ok(
    'image-left shows its content',
    (await page.locator('sn-image-left h1').innerText()) === 'image-left layout',
  );
  await page.close();

  const nope = await open('/nope', { width: 1280, height: 720 }).catch(() => null);
  t.ok(
    'an address that matches no slide shows the 404 layout',
    nope && (await nope.locator('sn-404').innerText()) === '404',
  );
  await nope?.close();
}
