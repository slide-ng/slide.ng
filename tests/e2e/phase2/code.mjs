// Highlighted code, line highlights and click steps, line numbers, max height, copy, snippets, code groups.
export async function run({ t, open, press, hud }) {
  let page = await open('/2');
  t.ok(
    'code is highlighted with Shiki (two themes as CSS variables)',
    (await page.locator('pre.shiki .line span').first().getAttribute('style')).includes(
      '--shiki-light',
    ),
  );
  t.ok(
    'code text is literal, braces and @ included',
    (await page.locator('pre.shiki code').innerText()).startsWith(
      'const o = { a: 1 }; // {{ not }} bound, @if too',
    ),
  );
  t.ok('inline code stays text', (await page.locator('p code').innerText()) === '{{ x }}');
  const color = () =>
    page
      .locator('pre.shiki .line span')
      .first()
      .evaluate((e) => getComputedStyle(e).color);
  const light = await color();
  await press(page, 'd');
  const dark = await color();
  t.ok('dark mode picks the dark colours', light !== dark, `${light} ${dark}`);
  await press(page, 'd');
  await page.close();

  page = await open('/3');
  const numbered = page.locator('.slidev-code-line-numbers');
  t.ok('{lines:true} draws line numbers (only on that block)', (await numbered.count()) === 1);
  t.ok(
    'line numbers start at startLine',
    (await numbered.evaluate((e) => e.style.getPropertyValue('--start'))) === '5',
  );
  t.ok(
    '{*} highlights every line',
    (await page.locator('.slidev-code-wrapper').first().locator('.line.highlighted').count()) === 4,
  );
  const box = page.locator('.slidev-code-wrapper').nth(1);
  t.ok(
    'maxHeight limits the block and lets it scroll',
    (await box.evaluate((e) => [e.style.maxHeight, getComputedStyle(e).overflowY].join())) ===
      '60px,scroll',
  );
  t.ok(
    'a code block is a block box, so its margin and border work',
    (await box.evaluate((e) => getComputedStyle(e).display)) === 'block',
  );
  t.ok(
    'a line not in the range is dimmed',
    (await box.locator('.line.dishonored').count()) === 5 &&
      (await box.locator('.line.highlighted').count()) === 1,
  );
  await page.waitForTimeout(600); // the block scrolls smoothly
  t.ok(
    'keeping the highlight in view scrolls only the block, never the page around it',
    (await page.evaluate(() =>
      [
        document.scrollingElement?.scrollTop ?? 0,
        document.querySelector('#slide-container')?.scrollTop ?? 0,
      ].join(),
    )) === '0,0',
  );
  await page.close();

  page = await open('/4');
  const lit = (n) =>
    page
      .locator('.slidev-code-wrapper')
      .nth(n)
      .locator('.line')
      .evaluateAll((l) => l.map((e) => (e.classList.contains('highlighted') ? 1 : 0)).join(''));
  t.ok('static {2,3} highlights lines 2 and 3', (await lit(0)) === '0110', await lit(0));
  t.ok(
    'stepped range: 4 stages mean 3 clicks (+1 for the div)',
    /^slide 4\/\d+ clicks 0\/4$/.test(await hud(page)),
    await hud(page),
  );
  t.ok('before the first click the first range shows', (await lit(1)) === '1000', await lit(1));
  const expected = ['1000', '0110', '0001', '1111'];
  for (let i = 1; i < 4; i++) {
    await press(page, 'ArrowRight');
    t.ok(`click ${i}: lines ${expected[i]}`, (await lit(1)) === expected[i], await lit(1));
  }
  const hidden = () =>
    page.locator('#after-code').evaluate((e) => e.classList.contains('slidev-vclick-hidden'));
  t.ok('slide-ng-click after the block waits for its own click', await hidden());
  await press(page, 'ArrowRight');
  t.ok('next click shows the element after the block', !(await hidden()));
  await page.close();

  page = await open('/5');
  t.ok(
    '<<< imports a #region without its markers, dedented',
    (await page.locator('pre.shiki code').first().innerText()).startsWith(
      'export function greet(name: string) {\n  const who',
    ),
  );
  t.ok(
    'snippet region has no region comments',
    !(await page.locator('pre.shiki code').first().innerText()).includes('region'),
  );
  t.ok(
    '<<< with @/ imports the whole file with options',
    (await page.locator('pre.shiki code').nth(1).innerText()).includes(
      'export const answer = { value: 42 };',
    ),
  );
  t.ok(
    'snippet gets ranges: first range shows line 1 only',
    (await page.locator('.slidev-code-wrapper').first().locator('.line.highlighted').count()) === 1,
  );

  await page.locator('.slidev-code-wrapper').first().hover();
  await page.locator('.slidev-code-copy').first().click();
  await page.waitForTimeout(200);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  t.ok(
    'copy button puts the code on the clipboard',
    clip.startsWith('export function greet(name: string) {'),
    clip.slice(0, 40),
  );
  t.ok(
    'copy button title changes to Copied',
    (await page.locator('.slidev-code-copy').first().getAttribute('title')) === 'Copied',
  );
  await page.close();

  page = await open('/6');
  const tabs = await page.locator('.slidev-code-tab').allInnerTexts();
  t.ok(
    'code group has one tab per block',
    tabs.map((x) => x.trim()).join('|') === 'npm|yarn',
    tabs.join('|'),
  );
  const visible = () =>
    page
      .locator('.slidev-code-group-blocks .slidev-code-wrapper')
      .evaluateAll((b) =>
        b
          .map((e) =>
            getComputedStyle(e).display !== 'none'
              ? e.querySelector('.slidev-code').textContent.trim()
              : '',
          )
          .join('|'),
      );
  t.ok(
    'first tab is shown first',
    (await visible()).startsWith('npm i @slide-ng/core'),
    await visible(),
  );
  await page.locator('.slidev-code-tab', { hasText: 'yarn' }).click();
  await page.waitForTimeout(150);
  t.ok(
    'clicking a tab shows its block',
    (await visible()).endsWith('yarn add @slide-ng/core'),
    await visible(),
  );
  await page.close();
}
