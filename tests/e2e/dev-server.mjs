// `npm run test:dev` (second part): starts the real dev server on a copy of a small deck and checks what the
// companion server does: slide-ng-drag moves are written into the markdown (also for names and bare slide-ng-drag), drawings
// and {monaco-write} edits are saved to files, bad requests are refused, and `--remote` needs its password.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { WebSocket } from 'ws';
import { launch, reporter } from './browser.mjs';

const WORK = 'tests/e2e/dev/work.md',
  SNIPPET = 'tests/e2e/dev/work-snippet.ts',
  DIR = 'tests/e2e/dev/.slide-ng'; // `.slide-ng` is next to the deck
const t = reporter();
const cleanup = () => {
  for (const f of [WORK, SNIPPET]) rmSync(f, { force: true });
  rmSync(DIR, { recursive: true, force: true });
};
const fresh = () => {
  copyFileSync('tests/e2e/dev/slides.md', WORK);
  copyFileSync('tests/e2e/dev/snippet.ts', SNIPPET);
};
const read = () => readFileSync(WORK, 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// detached = own process group, so the dev runner and everything it started can be stopped together.
function startDev(port, extra = [], capture = false) {
  const dev = spawn('npm', ['start', '--', '--port', String(port), ...extra], {
    stdio: ['ignore', capture ? 'pipe' : 'ignore', 'ignore'],
    detached: true,
    env: { ...process.env, SLIDES_FILE: WORK },
  });
  const stop = () => {
    try {
      process.kill(-dev.pid, 'SIGTERM');
    } catch {
      /* already gone */
    }
  };
  process.on('exit', stop);
  let output = '';
  dev.stdout?.on('data', (d) => (output += d));
  stop.output = () => output;
  return stop;
}
async function waitFor(url) {
  for (let i = 0; i < 180; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`${url} did not start`);
}
const waitForFile = async (check, ms = 15000) => {
  for (let i = 0; i < ms / 250; i++) {
    if (check(read())) return true;
    await sleep(250);
  }
  return false;
};
async function dragBy(page, sel, dx, dy) {
  await page.bringToFront();
  await sleep(1500);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  await sleep(1500);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  await sleep(1500);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  const b = await page.locator(sel).boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx / 2, b.y + b.height / 2 + dy / 2, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, { steps: 3 });
  await page.mouse.up();
}
const open = async (browser, url) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  await page.waitForTimeout(800);
  return page;
};
const api = (port, path, { method = 'GET', headers = {}, body } = {}) =>
  fetch(`http://localhost:${port}/__slide-ng${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body && JSON.stringify(body),
    redirect: 'manual',
  });

let browser, stop;
try {
  fresh();
  browser = await launch();

  // ===================================================================== local dev server
  const PORT = 4220,
    base = `http://localhost:${PORT}`;
  stop = startDev(PORT);
  await waitFor(base);
  const page = await open(browser, `${base}/2`);
  await page.evaluate(() => {
    window.__marker = 'alive';
  });

  const session = await (await fetch(`${base}/__slide-ng/session`)).json();
  t.ok(
    'the dev server answers /__slide-ng through the proxy and gives a token',
    typeof session.token === 'string' && session.token.length >= 32,
  );

  // ---- slide-ng-drag write-back
  const before = read();
  await dragBy(page, '#b1', 60, 40);
  t.ok(
    'moving a slide-ng-drag writes its new place into slides.md',
    await waitForFile((s) => /id="b1" slide-ng-drag="\[(?!100,100,)\d+,\d+,160,60\]"/.test(s)),
    read()
      .split('\n')
      .find((l) => l.includes('b1')),
  );
  t.ok(
    'and changes nothing else in the file',
    read().replace(/slide-ng-drag="\[\d+,\d+,160,60\]"/, 'slide-ng-drag="[100,100,160,60]"') ===
      before,
  );

  await dragBy(page, '#b2', -50, 30);
  t.ok(
    'a named position is written to dragPos in the frontmatter',
    await waitForFile((s) => /dragPos:\n {2}named: (?!300,200,)\d+,\d+,100,100\n/.test(s)),
    read().slice(0, 140),
  );
  t.ok(
    'the slide-ng-drag="named" tag itself is kept',
    read().includes('id="b2" slide-ng-drag="named"'),
  );

  await dragBy(page, '#b3', 40, 20);
  t.ok(
    'a bare slide-ng-drag becomes slide-ng-drag="[x,y,w,NaN]"',
    await waitForFile((s) => /id="b3" slide-ng-drag="\[\d+,\d+,\d+,NaN\]"/.test(s)),
    read()
      .split('\n')
      .find((l) => l.includes('b3')),
  );

  const x0 = +/id="b1" slide-ng-drag="\[(\d+),/.exec(read())[1];
  await sleep(4000);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  await page.keyboard.press('Escape');
  await dragBy(page, '#b1', 0, 0); // select without moving
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  t.ok(
    'arrow keys nudge and are saved once the keys rest',
    await waitForFile((s) => +/id="b1" slide-ng-drag="\[(\d+),/.exec(s)?.[1] === x0 + 3),
    `${x0} -> ${/id="b1" slide-ng-drag="\[(\d+),/.exec(read())?.[1]}`,
  );

  // after the page reloads or hot-updates, the element is where the file says
  await sleep(4000);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  const fileX = +/id="b1" slide-ng-drag="\[(\d+),/.exec(read())[1];
  t.ok(
    'after the rebuild the element is at the written place',
    (await page.locator('#b1').evaluate((e) => parseFloat(e.style.left))) === fileX,
    String(fileX),
  );

  // ---- drawings
  await page.locator('#nav-drawing').click({ force: true });
  await page.waitForTimeout(300);
  const c = await page.locator('#slide-content').boundingBox();
  await page.mouse.move(c.x + c.width * 0.2, c.y + c.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width * 0.4, c.y + c.height * 0.8, { steps: 6 });
  await page.mouse.up();
  let drawn = false;
  for (let i = 0; i < 40 && !drawn; i++) {
    await sleep(250);
    drawn = existsSync(`${DIR}/drawings/2.svg`);
  }
  t.ok(
    'a drawing is saved to .slide-ng/drawings/2.svg next to the deck (drawings.persist)',
    drawn && /<svg[^>]*>.*<path/s.test(readFileSync(`${DIR}/drawings/2.svg`, 'utf8')),
  );
  // Let the save settle first, so the clear is not swallowed by a save that is still running.
  await sleep(1000);
  await page.keyboard.press('c');
  let gone = false;
  for (let i = 0; i < 40 && !gone; i++) {
    await sleep(250);
    gone = !existsSync(`${DIR}/drawings/2.svg`);
  }
  t.ok('clearing the drawing deletes the file', gone);

  // ---- side editor
  await page.goto(`${base}/2`);
  await page.waitForFunction(
    () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    null,
    { timeout: 60000 },
  );
  const scriptsBefore = await page.evaluate(
    () => performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.js')).length,
  );
  t.ok(
    'before the editor opens there is no coloured text and no highlighter',
    (await page.locator('#editor-highlight').count()) === 0,
  );
  await page.locator('#nav-editor').click({ force: true });
  await page.waitForFunction(
    () => document.querySelector('#editor-text')?.value.includes('# Two'),
    null,
    { timeout: 15000 },
  );
  // The text is coloured by Shiki, which is loaded when the editor opens (like Slidev's editor); the textarea is transparent on top of it.
  await page.waitForSelector('#editor-highlight pre.shiki', { timeout: 30000 });
  const colours = await page.evaluate(() => {
    const spans = [...document.querySelectorAll('#editor-highlight span span')];
    return {
      distinct: new Set(spans.map((s) => getComputedStyle(s).color)).size,
      text: getComputedStyle(document.querySelector('#editor-text')).color,
    };
  });
  t.ok(
    'the editor text is coloured with more than one colour',
    colours.distinct > 1,
    JSON.stringify(colours),
  );
  t.ok(
    'the textarea itself is transparent, so the colours show through',
    colours.text === 'rgba(0, 0, 0, 0)',
    colours.text,
  );
  const scriptsAfter = await page.evaluate(
    () => performance.getEntriesByType('resource').filter((r) => r.name.endsWith('.js')).length,
  );
  t.ok(
    'the highlighter came as extra files when the editor opened',
    scriptsAfter > scriptsBefore,
    `${scriptsBefore} -> ${scriptsAfter}`,
  );
  const metrics = await page.evaluate(() => {
    const props = [
      'fontFamily',
      'fontSize',
      'lineHeight',
      'letterSpacing',
      'whiteSpace',
      'overflowWrap',
      'wordBreak',
      'tabSize',
      'paddingLeft',
      'paddingTop',
    ];
    const read = (el) => {
      const s = getComputedStyle(el);
      return { ...Object.fromEntries(props.map((k) => [k, s[k]])), width: el.clientWidth };
    };
    return {
      colours: read(document.querySelector('#editor-highlight')),
      field: read(document.querySelector('#editor-text')),
      code: getComputedStyle(document.querySelector('#editor-highlight code')).lineHeight,
    };
  });
  t.ok(
    'the coloured copy and the textarea have the same font, spacing, wrapping and width',
    JSON.stringify(metrics.colours) === JSON.stringify(metrics.field) &&
      metrics.code === metrics.field.lineHeight,
    JSON.stringify(metrics),
  );
  t.ok(
    'the side editor shows the markdown of the slide, frontmatter included',
    (await page.locator('#editor-text').inputValue()).includes('dragPos:'),
  );
  const stageRight = await page.locator('.stage').evaluate((e) => getComputedStyle(e).right);
  t.ok('the slide makes room for it', stageRight === '420px', stageRight);
  await page.locator('#editor-text').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n\n<p id="from-editor">Typed in the editor</p>\n');
  t.ok(
    'what is typed is coloured too',
    await page
      .waitForFunction(
        () =>
          document.querySelector('#editor-highlight')?.textContent.includes('Typed in the editor'),
        null,
        { timeout: 5000 },
      )
      .then(
        () => true,
        () => false,
      ),
  );
  t.ok(
    'typing in the editor saves into the markdown file',
    await waitForFile((s) => s.includes('<p id="from-editor">Typed in the editor</p>')),
  );
  t.ok(
    'and the other slides of the file are untouched',
    read().includes('# One') && read().includes('# Three'),
  );
  await page.waitForSelector('#from-editor', { timeout: 30000 });
  t.ok(
    'the slide shows the new text after the rebuild',
    (await page.locator('#from-editor').innerText()) === 'Typed in the editor',
  );
  await page.waitForSelector('#editor-text');
  // A change made outside (another editor, git) shows up in the open editor while nothing is being typed.
  writeFileSync(WORK, read().replace('Typed in the editor', 'Changed outside'));
  await page
    .waitForFunction(
      () => document.querySelector('#editor-text')?.value.includes('Changed outside'),
      null,
      { timeout: 15000 },
    )
    .then(
      () => t.ok('the open side editor takes over a change made outside', true),
      () =>
        t.ok(
          'the open side editor takes over a change made outside',
          false,
          'the textarea kept the old text',
        ),
    );
  await page.locator('#editor-close').click();
  await page.waitForTimeout(300);
  t.ok(
    'the close button closes it and the slide gets its room back',
    (await page.locator('#side-editor').count()) === 0 &&
      (await page.locator('.stage').evaluate((e) => getComputedStyle(e).right)) === '0px',
  );

  // ---- {monaco-write}
  await page.locator('#nav-drawing').click({ force: true }); // toolbar off, so the drawing layer lets clicks through
  await page.goto(`${base}/3`);
  await page.waitForSelector('.monaco-editor', { timeout: 60000 });
  await page.locator('.monaco-editor').click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\nexport const edited = true;');
  let saved = false;
  for (let i = 0; i < 40 && !saved; i++) {
    await sleep(250);
    saved = readFileSync(SNIPPET, 'utf8').includes('edited = true');
  }
  t.ok('{monaco-write} saves the edit into the snippet file', saved, readFileSync(SNIPPET, 'utf8'));
  t.ok(
    'the warning about {monaco-write} is gone and the file list holds only the snippet',
    existsSync(`${DIR}/monaco-files.json`) &&
      Object.values(JSON.parse(readFileSync(`${DIR}/monaco-files.json`, 'utf8'))).join() ===
        'work-snippet.ts',
  );

  // ---- notes: /overview edits one note, /notes-edit all of them in one text
  await page.goto(`${base}/overview`);
  const firstNote = page.locator('.overview-row[data-no="1"] .overview-note');
  await firstNote.waitFor({ timeout: 60000 });
  await sleep(1000); // the page has asked the server for its token
  await firstNote.dblclick();
  await page.locator('.overview-note-edit').waitFor({ timeout: 10000 });
  await page.locator('.overview-note-edit').fill('Said in the overview.');
  await page.locator('header h1').click(); // leaving the text saves it
  t.ok(
    'a note edited in /overview is saved into the markdown file',
    await waitForFile((s) =>
      /# One\n\nFirst slide\.\n\n<!--\nSaid in the overview\.\n-->\n/.test(s),
    ),
    read().slice(0, 200),
  );
  await sleep(4000); // the deck is rebuilt and the page reloads
  await page.goto(`${base}/notes-edit`);
  const area = page.locator('#notes-edit-text');
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-text')?.value.includes('Said in the overview.'),
    null,
    { timeout: 60000 },
  );
  const notesText = await area.inputValue();
  t.ok(
    '/notes-edit shows every note after its --- #N line',
    /^--- #1\n\nSaid in the overview\.\n\n--- #2\n[\s\S]*--- #3\n$/.test(notesText),
    notesText,
  );
  const beforeNotes = read();
  await area.fill(notesText.replace(/--- #3\n$/, '--- #3\n\nTyped for three.\n'));
  t.ok(
    'typing in /notes-edit saves the changed note into its slide',
    await waitForFile((s) => s.includes('<!--\nTyped for three.\n-->')),
  );
  t.ok(
    'and leaves the other slides as they were',
    read().trimEnd() === `${beforeNotes.trimEnd()}\n\n<!--\nTyped for three.\n-->`,
  );
  await sleep(4000);
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-status')?.dataset.status === 'saved',
    null,
    { timeout: 60000 },
  );
  const afterThree = read();
  await area.fill((await area.inputValue()).replace('--- #2', 'two'));
  await sleep(1500);
  t.ok(
    '/notes-edit refuses a text whose --- #N lines changed, and writes nothing',
    (await page.locator('#notes-edit-status').getAttribute('data-status')) === 'invalid' &&
      read() === afterThree,
  );
  // A --> in a note is written -- >, as the presenter's note editor does, instead of being refused.
  await page.evaluate(() => sessionStorage.clear()); // no draft of the broken text
  await page.goto(`${base}/notes-edit`);
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-status')?.dataset.status === 'saved',
    null,
    { timeout: 60000 },
  );
  await area.fill((await area.inputValue()).replace('Typed for three.', 'Arrow --> here.'));
  t.ok(
    '/notes-edit writes --> in a note as -- >',
    await waitForFile((s) => s.includes('<!--\nArrow -- > here.\n-->')),
    read().slice(-80),
  );
  await sleep(4000); // the deck is rebuilt and the page reloads
  // Keys typed while the page reads the notes again after a reload are kept (the notes answer late here).
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-status')?.dataset.status === 'saved',
    null,
    { timeout: 60000 },
  );
  await page.evaluate(() => {
    const text = document.querySelector('#notes-edit-text').value.replace('here.', 'here. draft');
    const at = text.indexOf('draft') + 'draft'.length;
    sessionStorage.setItem(
      'slide-ng-notes-draft',
      JSON.stringify({ text, start: at, end: at, at: Date.now() }),
    );
  });
  await page.route('**/__slide-ng/notes', async (route) => {
    await sleep(2500);
    await route.continue().catch(() => {}); // unrouted meanwhile: Playwright has let it through
  });
  await page.reload();
  await page.locator('#notes-edit-text:not([disabled])').waitFor({ timeout: 60000 });
  const whileLoading = await page.locator('#notes-edit-status').getAttribute('data-status');
  await page.keyboard.type(' typed', { delay: 50 });
  t.ok(
    '/notes-edit keeps the keys typed while the notes load after a reload',
    whileLoading === 'loading' &&
      (await waitForFile((s) => s.includes('<!--\nArrow -- > here. draft typed\n-->'))),
    `${whileLoading} ${read().slice(-80)}`,
  );
  await page.unroute('**/__slide-ng/notes');
  await sleep(4000);
  // Keys typed before the app has started again (its script answers late here) are kept by index.html and typed in then.
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-status')?.dataset.status === 'saved',
    null,
    { timeout: 60000 },
  );
  await page.route('**/main.js', async (route) => {
    await sleep(2500);
    await route.continue().catch(() => {});
  });
  await page.reload({ waitUntil: 'commit' });
  await page.waitForFunction(() => typeof window.slideNgEarlyKeys === 'function', null, {
    timeout: 60000,
  });
  const early = await page.locator('#notes-edit-text').count();
  await page.keyboard.type(' early', { delay: 50 });
  t.ok(
    '/notes-edit keeps the keys typed before the app is back after a reload',
    early === 0 &&
      (await waitForFile((s) => s.includes('<!--\nArrow -- > here. draft typed early\n-->'))),
    `${early} ${read().slice(-80)}`,
  );
  await page.unroute('**/main.js');
  await sleep(4000);
  // Keys pressed on another page while the draft is still fresh are not typed into the notes when /notes-edit opens by a link.
  await page.goto(`${base}/entry`);
  await page.locator('a[href$="/notes-edit"]').waitFor({ timeout: 60000 });
  const keptOnEntry = await page.evaluate(() => typeof window.slideNgEarlyKeys);
  await page.keyboard.type('foreign', { delay: 30 });
  await page.locator('a[href$="/notes-edit"]').click();
  await page.waitForFunction(
    () => document.querySelector('#notes-edit-status')?.dataset.status === 'saved',
    null,
    { timeout: 60000 },
  );
  await sleep(2000);
  t.ok(
    '/notes-edit does not type in keys pressed on another page',
    keptOnEntry === 'undefined' &&
      !(await page.locator('#notes-edit-text').inputValue()).includes('foreign') &&
      !read().includes('foreign'),
    `${keptOnEntry} ${read().slice(-80)}`,
  );

  // ---- bad requests, through the proxy
  const drag = (headers, extra = {}) =>
    api(PORT, '/slides/2/drag', {
      method: 'POST',
      headers,
      body: { site: 0, pos: '1,2,3,4' },
      ...extra,
    });
  const snapshot = read();
  t.ok('no token: refused', (await drag({})).status === 403);
  t.ok('wrong token: refused', (await drag({ 'x-slide-ng-token': 'nope' })).status === 403);
  t.ok(
    'right token but a foreign Origin: refused',
    (await drag({ 'x-slide-ng-token': session.token, origin: 'http://evil.example' })).status ===
      403,
  );
  t.ok(
    'a path in the address is not a route',
    (
      await api(PORT, '/monaco/..%2F..%2Fetc%2Fpasswd', {
        method: 'PUT',
        headers: { 'x-slide-ng-token': session.token },
        body: { content: 'x' },
      })
    ).status === 404,
  );
  t.ok('nothing was written by the refused requests', read() === snapshot);
  const ws = (query, headers = {}) =>
    new Promise((resolve) => {
      const s = new WebSocket(`ws://localhost:${PORT}/__slide-ng/ws${query}`, { headers });
      s.on('open', () => {
        s.close();
        resolve('open');
      });
      s.on('unexpected-response', (_q, res) => resolve(String(res.statusCode)));
      s.on('error', () => resolve('error'));
    });
  t.ok('WebSocket with a wrong token is refused', (await ws('?token=nope')) === '403');
  t.ok(
    'WebSocket with a foreign Origin is refused',
    (await ws(`?token=${session.token}`, { origin: 'http://evil.example' })) === '403',
  );
  t.ok('WebSocket with the token is accepted', (await ws(`?token=${session.token}`)) === 'open');
  await page.close();
  stop();
  await sleep(2000);

  // ===================================================================== --remote with a password
  fresh();
  const RPORT = 4221,
    rbase = `http://127.0.0.1:${RPORT}`;
  stop = startDev(RPORT, ['--remote=secret']);
  await waitFor(rbase);
  t.ok('--remote: no password, no session', (await api(RPORT, '/session')).status === 401);
  t.ok(
    '--remote: a wrong password is refused',
    (await api(RPORT, '/login', { method: 'POST', body: { password: 'wrong' } })).status === 401,
  );
  const login = await api(RPORT, '/login', { method: 'POST', body: { password: 'secret' } });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] ?? '';
  t.ok(
    '--remote: the right password gives a cookie',
    login.status === 200 && cookie.startsWith('slide-ng-auth='),
  );
  const rsession = await (await api(RPORT, '/session', { headers: { cookie } })).json();
  t.ok('--remote: with the cookie the session gives its token', typeof rsession.token === 'string');
  const wsr = (headers) =>
    new Promise((resolve) => {
      const s = new WebSocket(`ws://127.0.0.1:${RPORT}/__slide-ng/ws?token=${rsession.token}`, {
        headers,
      });
      s.on('open', () => {
        s.close();
        resolve('open');
      });
      s.on('unexpected-response', (_q, res) => resolve(String(res.statusCode)));
      s.on('error', () => resolve('error'));
    });
  t.ok('--remote: WebSocket without the cookie is refused', (await wsr({})) === '401');
  t.ok('--remote: WebSocket with the cookie is accepted', (await wsr({ cookie })) === 'open');
  t.ok(
    '--remote: a write with the token but no cookie is refused',
    (
      await api(RPORT, '/slides/2/drag', {
        method: 'POST',
        headers: { 'x-slide-ng-token': rsession.token },
        body: { site: 0, pos: '1,2,3,4' },
      })
    ).status === 401,
  );

  // two separate browsers (own storage, no shared BroadcastChannel): the presenter drives, the viewer follows over the WebSocket
  const a = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const b = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const presenter = await a.newPage(),
    viewer = await b.newPage();
  await presenter.goto(`${rbase}/presenter/1?password=secret`);
  await viewer.goto(`${rbase}/1?password=secret`);
  for (const p of [presenter, viewer])
    await p.waitForFunction(
      () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
      null,
      { timeout: 60000 },
    );
  // The login runs while the deck opens; on a slow machine the address is cleaned a moment after the HUD shows.
  for (const p of [presenter, viewer])
    await p
      .waitForFunction(() => !location.search.includes('password'), null, { timeout: 15000 })
      .catch(() => {});
  t.ok(
    '--remote: the password is removed from the address bar',
    !presenter.url().includes('password') && !viewer.url().includes('password'),
    presenter.url(),
  );
  await presenter.waitForTimeout(1500);
  await presenter.bringToFront();
  await presenter.keyboard.press('ArrowDown');
  let followed = false;
  for (let i = 0; i < 30 && !followed; i++) {
    await sleep(250);
    followed = /slide 2\//.test(await viewer.locator('#hud').innerText());
  }
  t.ok(
    '--remote: the viewer in another browser follows the presenter over the WebSocket',
    followed,
    await viewer.locator('#hud').innerText(),
  );
  // Without the password (the prompt is dismissed) the presenter page sends you to the slides, as in Slidev.
  const outsider = await browser.newContext({ viewport: { width: 1000, height: 600 } });
  const stranger = await outsider.newPage();
  stranger.on('dialog', (d) => d.dismiss());
  await stranger.goto(`${rbase}/presenter/1`);
  await stranger
    .waitForFunction(() => !location.pathname.startsWith('/presenter'), null, { timeout: 30000 })
    .catch(() => {});
  t.ok(
    '--remote: without the password /presenter goes to the slides (no notes)',
    !new URL(stranger.url()).pathname.startsWith('/presenter'),
    stranger.url(),
  );
  await outsider.close();
  await a.close();
  await b.close();
  stop();
  await sleep(2000);

  // ===================================================================== --remote without a password: a random one is made
  fresh();
  const OPORT = 4232,
    obase = `http://127.0.0.1:${OPORT}`;
  stop = startDev(OPORT, ['--remote'], true);
  await waitFor(obase);
  for (let i = 0; i < 40 && !/random one was made/.test(stop.output()); i++) await sleep(250);
  // The proxy answers before the companion server is up; wait until /session is answered by the companion itself.
  for (let i = 0; i < 80; i++) {
    const status = await api(OPORT, '/session').then(
      (r) => r.status,
      () => 0,
    );
    if (status === 401) break;
    await sleep(250);
  }
  const made = /random one was made for this run: (\S+)/.exec(stop.output())?.[1] ?? '';
  t.ok(
    '--remote without a password: a random password of 16+ characters is printed',
    made.length >= 16,
    made,
  );
  t.ok(
    '--remote without a password: the presenter address carries it',
    stop.output().includes(`/presenter/1?password=${encodeURIComponent(made)}`),
  );
  t.ok(
    '--remote without a password: there is no passwordless mode, the session needs the login',
    (await api(OPORT, '/session')).status === 401,
  );
  t.ok(
    '--remote without a password: an empty password is refused',
    (await api(OPORT, '/login', { method: 'POST', body: { password: '' } })).status === 401,
  );
  const ologin = await api(OPORT, '/login', { method: 'POST', body: { password: made } });
  const ocookie = ologin.headers.get('set-cookie')?.split(';')[0] ?? '';
  t.ok(
    '--remote without a password: the printed password logs in',
    ologin.status === 200 && ocookie !== '',
  );
  const osession = await api(OPORT, '/session', { headers: { cookie: ocookie } });
  t.ok(
    '--remote without a password: after the login the session gives its token',
    osession.status === 200 && typeof (await osession.json()).token === 'string',
  );
  t.ok(
    '--remote without a password: a foreign Origin is refused',
    (await api(OPORT, '/session', { headers: { cookie: ocookie, origin: 'http://evil.example' } }))
      .status === 403,
  );
  // Wrong passwords are limited per client address through the real proxy; what the client writes in X-Forwarded-For does not help.
  const forged = (n) => ({ 'x-forwarded-for': `10.9.8.${n}` });
  const statuses = [];
  for (let i = 0; i < 6; i++)
    statuses.push(
      (
        await api(OPORT, '/login', {
          method: 'POST',
          body: { password: `x${i}` },
          headers: forged(i),
        })
      ).status,
    );
  t.ok(
    '--remote: after 5 wrong passwords the client is locked out, however it fills X-Forwarded-For',
    statuses.indexOf(429) > 0 &&
      statuses.slice(0, statuses.indexOf(429)).every((s) => s === 401) &&
      statuses.slice(statuses.indexOf(429)).every((s) => s === 429),
    statuses.join(),
  );
  const locked = await api(OPORT, '/login', { method: 'POST', body: { password: made } });
  t.ok('--remote: the lock also stops the right password', locked.status === 429);
} finally {
  await browser?.close();
  stop?.();
  cleanup();
  await new Promise((r) => setTimeout(r, 500));
  spawn('node', ['scripts/generate.mjs'], { stdio: 'ignore' });
}
process.exit(t.done());
