// One check per setup hook: the output of the deck is different because of the files in phase5/setup/.
export async function run({ t, open, press, base, browser, problems }) {
  let page = await open('/1');
  const root = (name) => page.evaluate((n) => document.documentElement.dataset[n], name);
  t.ok('main: the providers of setup/main.ts are in the app', (await root('main')) === 'yes');
  t.ok('root: setup/root.ts ran', (await root('root')) === 'yes');
  t.ok(
    'katex: the macro of setup/katex.ts is drawn as a double-struck R',
    (await page.locator('.katex .mathbb').count()) === 1,
  );
  t.ok(
    'transformers.pre: the markdown syntax became HTML',
    (await page.locator('#from-pre').innerText()) === 'from pre',
  );
  t.ok(
    'transformers.codeblocks: the block became our element',
    (await page.locator('#from-codeblock').innerText()) === '11 characters',
  );
  t.ok(
    'preparser: the raw line was replaced before slides were cut',
    (await page.locator('#from-preparser').innerText()) === 'preparsed',
  );
  t.ok(
    'shiki: the transformer marked every highlighted block',
    (await page.locator('pre.shiki[data-setup="shiki"]').count()) === 2,
  );
  t.ok(
    'shiki: the extra language is highlighted',
    (await page.locator('pre.shiki[data-setup="shiki"]').last().locator('span span').count()) > 1,
  );
  await press(page, 'x');
  t.ok('shortcuts: the added key works', (await root('shortcut')) === 'pressed');
  t.ok('shortcuts: the default keys still work', new URL(page.url()).pathname === '/1');
  await page.locator('h1').click({ button: 'right', position: { x: 20, y: 10 } });
  await page.locator('#context-menu .slidev-menu-item').last().waitFor({ timeout: 5000 });
  const labels = await page.locator('#context-menu .slidev-menu-item').allInnerTexts();
  t.ok(
    'context menu: the added entry follows the built-in ones',
    labels.at(-1)?.trim() === 'Setup item' && labels.length > 1,
    labels.join('|'),
  );
  await page.locator('#context-menu .slidev-menu-item', { hasText: 'Setup item' }).click();
  t.ok('context menu: the entry runs', (await root('menu')) === 'clicked');
  await page.close();

  page = await open('/1');
  const swipe = (from, to, vertical = false) =>
    page.evaluate(
      ([a, b, up]) => {
        const stage = document.querySelector('.stage');
        const at = (v) =>
          new Touch({
            identifier: 1,
            target: stage,
            clientX: up ? 400 : v,
            clientY: up ? v : 300,
          });
        const event = (type, v) =>
          new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [at(v)],
            changedTouches: [at(v)],
            bubbles: true,
          });
        stage.dispatchEvent(event('touchstart', a));
        stage.dispatchEvent(event('touchmove', b));
        stage.dispatchEvent(event('touchend', b));
      },
      [from, to, vertical],
    );
  await swipe(600, 560); // too short
  await page.waitForTimeout(200);
  t.ok('touch: a short swipe stays on the slide', new URL(page.url()).pathname === '/1');
  await swipe(600, 300);
  await page.waitForFunction(() => location.pathname === '/2');
  t.ok('touch: a swipe to the left goes to the next slide', true);
  await swipe(300, 600);
  await page.waitForFunction(() => location.pathname === '/1');
  t.ok('touch: a swipe to the right goes back', true);
  await swipe(600, 150, true);
  await page.waitForFunction(() => location.pathname === '/2');
  t.ok('touch: a swipe up goes to the next slide', true);
  await page.close();

  // Headmatter `presenter: false`: no presenter page, no button, no menu entry.
  page = await open('/presenter/1');
  t.ok(
    'presenter: false sends the presenter address to slide 1',
    new URL(page.url()).pathname === '/1',
    page.url(),
  );
  t.ok(
    'presenter: false hides the presenter button',
    !(await page.locator('#nav-presenter').isVisible()),
  );
  t.ok(
    'presenter: false is not offered in the context menu',
    !(await page.locator('#context-menu').count()),
  );
  await page.locator('h1').click({ button: 'right', position: { x: 20, y: 10 } });
  t.ok(
    'presenter: false leaves no presenter entry in the context menu',
    !(await page.locator('#context-menu').innerText()).includes('Presenter'),
  );
  // Headmatter `fonts`: the mono list is the code font.
  const mono = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--slidev-code-font-family'),
  );
  const used = await page
    .locator('pre.shiki')
    .first()
    .evaluate((e) => getComputedStyle(e).fontFamily);
  t.ok(
    'fonts: the mono font becomes the code font',
    mono.includes('Courier New') && used.startsWith('"Courier New"'),
    used,
  );
  await page.close();

  page = await open('/2');
  await page.waitForFunction(() => document.querySelectorAll('.mermaid > svg').length === 2, null, {
    timeout: 20000,
  });
  const svg = await page.locator('.mermaid > svg').first().innerHTML();
  t.ok(
    'mermaid: the config of setup/mermaid.ts colours the diagram',
    /#ff0000|rgb\(255, 0, 0\)/i.test(svg),
  );
  const custom = page.locator('.mermaid > svg#from-renderer');
  t.ok(
    'mermaid-renderer: setup/mermaid-renderer.ts drew the diagram with the merged options',
    (await custom.locator('text').textContent()) === 'drawn by the renderer' &&
      (await custom.locator('text').getAttribute('fill')) === '#ff0000',
  );
  t.ok(
    'mermaid-renderer: the export marker is cleared once the SVG is there',
    (await page.locator('slide-ng-mermaid[data-slide-ng-waitfor]').count()) === 0,
  );
  await page.close();

  // setup/routes.ts appends a page; it is reached before `:no` and the catch-all, which still send other addresses to slides.
  page = await browser.newPage();
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(`${base}/hello`);
  await page.locator('#hello-page').waitFor({ timeout: 10000 });
  t.ok('routes: the page of setup/routes.ts is shown', new URL(page.url()).pathname === '/hello');
  t.ok(
    'routes: the page has no Nav (it is outside the deck) but can inject Dark',
    (await page.locator('#hello-services').textContent())?.trim() === 'no nav, light',
    await page.locator('#hello-services').textContent(),
  );
  await page.goto(`${base}/no/where`);
  await page.waitForFunction(() => location.pathname === '/1');
  t.ok('routes: an unknown address still goes to slide 1', true);
  await page.close();

  page = await open('/3');
  await page.waitForSelector('.monaco-editor .view-lines', { timeout: 30000 });
  const size = await page
    .locator('.monaco-editor .view-lines')
    .first()
    .evaluate((e) => getComputedStyle(e).fontSize);
  t.ok('monaco: the options of setup/monaco.ts apply to the editor', size === '22px', size);
  await page.waitForFunction(
    () => /python says 2/.test(document.querySelector('.slidev-runner-output')?.textContent ?? ''),
    null,
    { timeout: 20000 },
  );
  t.ok(
    'code runners: the python runner of setup/code-runners.ts ran the editor',
    (await page.locator('.slidev-runner-output').innerText()).includes('python says 2'),
  );
  await page.close();
}
