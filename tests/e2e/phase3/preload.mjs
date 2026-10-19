// Headmatter `preloadImages: { ahead: 2 }` and slide `preload: false` (the preload deck): pictures load before their slide.
export async function run({ t, open, press, hud }) {
  const asked = new Set();
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const page = await open('/1', { width: 1280, height: 720 }, (p) =>
    p.route('**/pics/*.png', (route) => {
      asked.add(new URL(route.request().url()).pathname.replace('/pics/', ''));
      return route.fulfill({ contentType: 'image/png', body: png });
    }),
  );
  await page.waitForTimeout(1000);
  const early = [...asked].sort().join();
  t.ok(
    'preloadImages: the pictures of the next two slides are asked for while slide 1 is shown',
    asked.has('two.png') && asked.has('three.png'),
    early,
  );
  t.ok(
    'preloadImages: { ahead: 2 } does not reach slide 4 at first',
    !asked.has('four.png') && !asked.has('six.png'),
    early,
  );
  await page.waitForTimeout(3000);
  t.ok(
    'after 3 seconds every slide is preloaded, except the one with preload: false',
    asked.has('four.png') && asked.has('six.png') && !asked.has('five.png'),
    [...asked].sort().join(),
  );
  t.ok(
    'preloading does not move the deck: still on slide 1',
    (await hud(page)).startsWith('slide 1/6'),
  );
  await press(page, 'ArrowRight', 300);
  const shown = await page
    .locator('img[alt="two"]')
    .evaluate((img) => img.complete && img.naturalWidth > 0);
  t.ok('the preloaded picture is there when its slide is shown', shown);
  await page.close();
}
