// `npm run test:dev` (deck browser part): starts the real dev server on tests/e2e/deck-browser/slides.md, with a fake site on
// 127.0.0.1:47121 that refuses framing. Through the companion's proxy the site still shows inside the deck, the address
// follows clicks inside the page, back and forward move through what was seen, the search box uses `browser.search`, a
// link that opens a new window becomes a tab, a sign-in with a default (Lax) cookie or a cookie set by a script stays signed in,
// a form of another site gets none of those cookies, and the proxy refuses the deck's own servers and local addresses the deck
// did not open.
import { spawn } from 'node:child_process';
import http from 'node:http';
import { launch, reporter } from './browser.mjs';

const PORT = 4241;
const SITE = 47121;
const EVIL = 47123;
const t = reporter();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const transfers = [];
const site = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${SITE}`);
  const has = (name) =>
    (req.headers.cookie ?? '').split(/;\s*/).some((c) => c.startsWith(`${name}=`));
  const refusing = (body) => {
    res.setHeader('content-type', 'text/html');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('content-security-policy', "frame-ancestors 'none'");
    res.end(body);
  };
  if (url.pathname === '/signin' && req.method === 'POST') {
    res.writeHead(303, { 'set-cookie': 'sid=1; Path=/; HttpOnly', location: '/signin' }).end();
    return;
  }
  if (url.pathname === '/signin')
    return refusing(
      `<!doctype html><title>Sign in</title><p id="status">${has('sid') ? 'SIGNED-IN' : 'SIGNED-OUT'}</p>` +
        `<form method="post" action="/signin"><button id="go">Sign in</button></form>` +
        `<form method="post" action="/transfer"><button id="pay-own">Pay</button></form>` +
        `<button id="script" onclick="document.cookie='tok=1; path=/'">Set by script</button> <a id="who" href="/whoami">who</a>`,
    );
  if (url.pathname === '/whoami')
    return refusing(
      `<!doctype html><title>Who</title><p id="status">${has('tok') ? 'SCRIPT-COOKIE' : 'NO-SCRIPT-COOKIE'}</p>` +
        `<p id="seen"></p><script>document.getElementById('seen').textContent = document.cookie</script>`,
    );
  if (url.pathname === '/transfer') {
    transfers.push({ method: req.method, signedIn: has('sid') });
    return refusing('<!doctype html><title>Done</title><p id="status">DONE</p>');
  }
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
const evil = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  res.end(
    `<!doctype html><title>Other site</title><form method="post" action="http://127.0.0.1:${SITE}/transfer"><button id="pay">Pay</button></form>`,
  );
});
await new Promise((r) => evil.listen(EVIL, r));

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

const open = async (address) => {
  await page.locator('#deck-browser-address').fill(address);
  await page.locator('#deck-browser-address').press('Enter');
};
const statusIs = async (path, want) => {
  for (let i = 0; i < 40; i++) {
    const f = frameOf(path);
    if (
      (await f
        ?.locator('#status')
        .innerText()
        .catch(() => '')) === want
    )
      return true;
    await sleep(250);
  }
  return false;
};

await open(`http://127.0.0.1:${SITE}/signin`);
t.ok('cookies: a page starts signed out', await statusIs('/signin', 'SIGNED-OUT'));
await frameOf('/signin').locator('#go').click();
t.ok(
  'cookies: a sign-in with a default (Lax) cookie stays signed in',
  await statusIs('/signin', 'SIGNED-IN'),
);
t.ok(
  'cookies: the browser itself holds none of the site cookies',
  (await page.context().cookies()).filter((c) => c.domain.includes('.localhost')).length === 0,
  JSON.stringify((await page.context().cookies()).map((c) => c.name)),
);
await frameOf('/signin').locator('#script').click();
await sleep(700);
await frameOf('/signin').locator('#who').click();
t.ok(
  'cookies: a cookie a script sets with document.cookie reaches the site',
  await statusIs('/whoami', 'SCRIPT-COOKIE'),
);
t.ok(
  'cookies: document.cookie shows it, and not the HttpOnly sign-in',
  (await frameOf('/whoami')?.locator('#seen').innerText()) === 'tok=1',
);
await open(`http://127.0.0.1:${SITE}/signin?again=1`);
await statusIs('/signin', 'SIGNED-IN');
await frameOf('/signin').locator('#pay-own').click();
for (let i = 0; i < 40 && transfers.length < 1; i++) await sleep(250);
t.ok(
  'cookies: a form of the same site carries the sign-in',
  transfers[0]?.method === 'POST' && transfers[0]?.signedIn === true,
  JSON.stringify(transfers),
);
await open(`http://localhost:${EVIL}/`);
let pay = null;
for (let i = 0; i < 40 && !pay; i++) {
  pay =
    page
      .frames()
      .find((f) => f.url().includes('.localhost:') && f.url().includes('http-' + EVIL)) ?? null;
  if (!pay) await sleep(250);
}
await pay.locator('#pay').click();
for (let i = 0; i < 40 && transfers.length < 2; i++) await sleep(250);
t.ok(
  'cookies: a form of another site arrives without the sign-in',
  transfers[1]?.method === 'POST' && transfers[1]?.signedIn === false,
  JSON.stringify(transfers),
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

t.ok(
  'proxy: a local address loads only once the deck opened it',
  (await asks(`127.0.0.1.http-${SITE + 1}.${proxy.key}.localhost:${proxy.port}`)) === 403 &&
    (await page.evaluate(
      async (url) => {
        const { token } = await (await fetch('/__slide-ng/session')).json();
        const res = await fetch('/__slide-ng/web-proxy/open', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-slide-ng-token': token },
          body: JSON.stringify({ url }),
        });
        return res.status;
      },
      `http://127.0.0.1:${SITE + 1}/`,
    )) === 200 &&
    (await asks(`127.0.0.1.http-${SITE + 1}.${proxy.key}.localhost:${proxy.port}`)) === 502,
);

t.ok('no page errors', problems.length === 0, JSON.stringify(problems));
await browser.close();
site.close();
evil.close();
stop();
process.exit(t.done());
