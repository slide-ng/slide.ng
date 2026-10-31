// `npm run test:dev` (deck browser part): starts the real dev server on tests/e2e/deck-browser/slides.md, with a fake site on
// 127.0.0.1:47121 that refuses framing. Through the companion's proxy the site still shows inside the deck, the address
// follows clicks inside the page, back and forward move through what was seen, the search box uses `browser.search`, a
// link that opens a new window becomes a tab, and the proxy refuses the deck's own servers.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { launch, reporter } from './browser.mjs';

const PORT = 4241;
const SITE = 47121;
const t = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const site = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${SITE}`);
  res.setHeader('content-type', 'text/html');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('content-security-policy', "frame-ancestors 'none'");
  const query = url.searchParams.get('q') ?? '';
  res.end(
    `<!doctype html><title>Page ${url.pathname}</title><body><h1 id="page">${url.pathname}</h1>` +
      `<p id="query">${query.replace(/[<&]/g, '')}</p>` +
      `<a id="next" href="/next">next</a> <a id="abs" href="http://127.0.0.1:${SITE}/absolute">absolute</a> ` +
      `<a id="new" href="/popup" target="_blank">new window</a></body>`,
  );
});
await new Promise((r) => site.listen(SITE, '127.0.0.1', r));

const dev = spawn('npm', ['start', '--', '--port', String(PORT)], {
  stdio: 'ignore',
  detached: true,
  env: { ...process.env, SLIDES_FILE: 'tests/e2e/deck-browser/slides.md' },
});
const stop = () => {
  try {
    process.kill(-dev.pid, 'SIGTERM');
  } catch {
    return;
  }
};
process.on('exit', stop);
for (let i = 0; i < 180; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    await sleep(1000);
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('pageerror', (e) => problems.push(String(e)));
await page.goto(`http://localhost:${PORT}/1`);
await page.waitForSelector('#hud', { state: 'attached', timeout: 60000 });
console.log('\n== deck browser through the proxy');

const address = () => page.inputValue('#deck-browser-address');
const addressIs = async (want) => {
  for (let i = 0; i < 40; i++) {
    if ((await address()) === want) return true;
    await sleep(250);
  }
  return false;
};
const frameOf = (path) =>
  page.frames().find((f) => new URL(f.url()).pathname === path && f.url().includes('.localhost:'));
const waitFrame = async (path) => {
  for (let i = 0; i < 40; i++) {
    const f = frameOf(path);
    if (f) return f;
    await sleep(250);
  }
  return null;
};

await page.locator('a', { hasText: 'Demo site' }).click();
const demo = await waitFrame('/demo');
t.ok(
  'proxy: a site that refuses framing shows inside the deck, from its own origin',
  !!demo &&
    (await demo.locator('#page').innerText()) === '/demo' &&
    (await page.locator('#deck-browser-refused').count()) === 0,
  demo?.url(),
);
t.ok(
  'proxy: the address is the real one',
  await addressIs(`http://127.0.0.1:${SITE}/demo`),
  await address(),
);

await demo.locator('#next').click();
t.ok(
  'proxy: a click inside the page moves the address along',
  await addressIs(`http://127.0.0.1:${SITE}/next`),
  await address(),
);
const next = await waitFrame('/next');
await next.locator('#abs').click();
t.ok(
  'proxy: an absolute link stays inside the deck browser',
  (await addressIs(`http://127.0.0.1:${SITE}/absolute`)) && !!(await waitFrame('/absolute')),
  await address(),
);
await page.locator('#deck-browser-back').click();
t.ok(
  'proxy: back goes to the page before',
  await addressIs(`http://127.0.0.1:${SITE}/next`),
  await address(),
);
await page.locator('#deck-browser-back').click();
await page.locator('#deck-browser-forward').click();
t.ok(
  'proxy: forward goes on again',
  (await addressIs(`http://127.0.0.1:${SITE}/next`)) && (await waitFrame('/next')) !== null,
  await address(),
);

const before = await page.locator('#deck-browser [role=tab]').count();
await (await waitFrame('/next')).locator('#new').click();
await sleep(1000);
t.ok(
  'proxy: a link to a new window opens a new tab',
  (await page.locator('#deck-browser [role=tab]').count()) === before + 1 &&
    (await addressIs(`http://127.0.0.1:${SITE}/popup`)),
  await address(),
);

await page.locator('#deck-browser-address').fill('hello world');
await page.locator('#deck-browser-address').press('Enter');
const search = await waitFrame('/search');
t.ok(
  'search: words in the address field search with browser.search',
  !!search &&
    (await search.locator('#query').innerText()) === 'hello world' &&
    (await addressIs(`http://127.0.0.1:${SITE}/search?q=hello%20world`)),
  await address(),
);

await page.locator('#deck-browser-new').click();
t.ok(
  'start page: a new tab shows the slide.ng browser page',
  await page
    .locator('#deck-browser-start')
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false),
);
await page.locator('#deck-browser-search').fill('from start');
await page.locator('#deck-browser-search').press('Enter');
let fromStart = null;
for (let i = 0; i < 40 && !fromStart; i++) {
  fromStart = page.frames().find((f) => f.url().includes('q=from%20start')) ?? null;
  if (!fromStart) await sleep(250);
}
t.ok(
  'start page: its search box searches in that tab',
  (await addressIs(`http://127.0.0.1:${SITE}/search?q=from%20start`)) &&
    (await fromStart?.locator('#query').innerText()) === 'from start',
  await address(),
);

const proxy = await page.evaluate(async () => {
  const { token } = await (await fetch('/__slide-ng/session')).json();
  return (await fetch('/__slide-ng/web-proxy', { headers: { 'x-slide-ng-token': token } })).json();
});
const asks = (host) =>
  new Promise((resolve) =>
    http
      .get(
        { host: '127.0.0.1', port: proxy.port, path: '/__slide-ng/session', headers: { host } },
        (res) => resolve(res.statusCode),
      )
      .on('error', () => resolve(0)),
  );
t.ok(
  "proxy: it refuses the deck's own server and addresses with another key",
  (await asks(`localhost.http-${PORT}.${proxy.key}.localhost:${proxy.port}`)) === 403 &&
    (await asks(`localhost.http-${PORT}.wrongkey.localhost:${proxy.port}`)) === 404,
  JSON.stringify(proxy),
);

t.ok('no page errors', problems.length === 0, JSON.stringify(problems));
await browser.close();
site.close();
stop();
process.exit(t.done());
