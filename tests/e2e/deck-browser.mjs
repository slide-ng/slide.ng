// `npm run test:e2e` (deck browser part): builds tests/e2e/deck-browser/slides.md and checks the deck browser in a browser. A second
// server on 127.0.0.1:47121 is the other site: a link to it opens in a deck-browser tab, `b` and Escape open and close the layer,
// and closing it brings back the same slide and click.
import { execSync } from 'node:child_process';
import http from 'node:http';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const SITE_PORT = 47121;

if (!process.env.SKIP_BUILD) {
  try {
    execSync(
      'node scripts/generate.mjs && node node_modules/@angular/cli/bin/ng.js build --output-path dist/deck-browser',
      {
        stdio: 'inherit',
        env: { ...process.env, SLIDES_FILE: 'tests/e2e/deck-browser/slides.md' },
      },
    );
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' });
  }
}

const site = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(`<!doctype html><title>${req.url}</title><body><h1 id="page">${req.url}</h1></body>`);
});
await new Promise((r) => site.listen(SITE_PORT, '127.0.0.1', r));

const browser = await launch();
const t = reporter();
const { server, port } = await serve('dist/deck-browser/browser');
const ctx = makeContext(`http://localhost:${port}`, browser, t);
const { open, press } = ctx;
console.log('\n== deck browser');

const page = await open('/1');
const layerOpen = () => page.locator('#deck-browser').isVisible();
const tabs = () => page.locator('#deck-browser [role=tab]').allInnerTexts();

await press(page, 'ArrowRight');
t.ok('deck browser: it starts closed', !(await layerOpen()));
await press(page, 'b');
t.ok(
  'deck browser: it opens on the slide.ng browser page, with a tile for each tab of the headmatter',
  (await page.locator('#deck-browser-start').isVisible()) &&
    (await page.locator('.deck-browser-tile', { hasText: 'Ready tab' }).count()) === 1,
);
await page.locator('.deck-browser-tile', { hasText: 'Ready tab' }).click();
await page
  .frameLocator('#deck-browser .deck-browser-frame[src*="/ready"]')
  .locator('#page')
  .waitFor();
t.ok(
  'deck browser: a tile opens its page in that tab',
  JSON.stringify(await tabs()) === '["Ready tab"]',
);
await page.locator('#deck-browser-hide').click();
await page.locator('a', { hasText: 'Demo site' }).click();
await page.locator('#deck-browser .deck-browser-frame[src*="/demo"]').waitFor();
const frame = page.frameLocator('#deck-browser .deck-browser-frame[src*="/demo"]');
t.ok(
  'deck browser: a link to another site opens in a new tab, and the other tab stays loaded',
  (await layerOpen()) &&
    JSON.stringify(await tabs()) === '["Ready tab","Demo site"]' &&
    (await frame.locator('#page').innerText()) === '/demo' &&
    (await page.locator('#deck-browser .deck-browser-frame').count()) === 2,
  JSON.stringify(await tabs()),
);
await page.locator('#deck-browser-address').fill('127.0.0.1:47121/typed');
await page.locator('#deck-browser-address').press('Enter');
await page
  .frameLocator('#deck-browser .deck-browser-frame[src*="/typed"]')
  .locator('#page')
  .waitFor();
t.ok('deck browser: a typed address opens in the tab', true);

await page.locator('#deck-browser-hide').click();
await page.locator('#deck-browser').waitFor({ state: 'hidden' });
t.ok(
  'deck browser: the × button brings back the same slide and click',
  !(await layerOpen()) &&
    new URL(page.url()).pathname === '/1' &&
    (await ctx.hud(page)).includes('clicks 1/'),
  `${page.url()} ${await ctx.hud(page)}`,
);
await press(page, 'b');
t.ok(
  'deck browser: b opens it again, with its tabs',
  (await layerOpen()) && (await tabs()).length === 2,
);
await press(page, 'ArrowRight');
t.ok('deck browser: the slide keys wait while it is open', new URL(page.url()).pathname === '/1');
await press(page, 'Escape');
t.ok(
  'deck browser: Escape brings back the same slide',
  !(await layerOpen()) && new URL(page.url()).pathname === '/1',
);
await page.locator('a', { hasText: 'Slide two' }).click();
await page.waitForTimeout(300);
t.ok(
  'deck browser: a link of the deck itself still moves through the deck',
  !(await layerOpen()) && new URL(page.url()).pathname === '/2',
  page.url(),
);

const group = await ctx.windowGroup();
const deck = await group.newPage();
const presenter = await group.newPage();
await deck.goto(`http://localhost:${port}/1`);
await presenter.goto(`http://localhost:${port}/presenter/1`);
await deck.waitForSelector('#hud', { state: 'attached' });
await presenter.waitForSelector('#hud', { state: 'attached' });
await deck.locator('a', { hasText: 'Demo site' }).click();
await presenter
  .locator('#presenter-browser')
  .waitFor({ timeout: 5000 })
  .catch(() => {});
t.ok(
  'deck browser: the presenter page shows the open page',
  (await presenter.locator('#presenter-browser').innerText()).includes('127.0.0.1'),
);
await presenter.locator('#presenter-browser button').click();
t.ok(
  'deck browser: closing it on the presenter page closes it in the deck window',
  await ctx.until(
    deck,
    () => getComputedStyle(document.querySelector('#deck-browser')).display === 'none',
  ),
);
await group.close();

t.ok('no console errors or warnings', ctx.problems.length === 0, JSON.stringify(ctx.problems));
await browser.close();
server.close();
site.close();
process.exit(t.done());
