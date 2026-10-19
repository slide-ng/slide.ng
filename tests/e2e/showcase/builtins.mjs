// Table of contents, built-in components, routeAlias, clicks override, scoped style and src imports.
export async function run({ t, open, press, hud, pathOf, style }) {
  // ---- table of contents (slides 20 to 25) ------------------------------------------
  let page = await open('/20');
  const items = (sel) =>
    page
      .locator(`${sel} li`)
      .allInnerTexts()
      .then((l) => l.map((x) => x.split('\n')[0].trim()));
  t.ok(
    'toc lists titled slides in a tree and skips hideInToc ones',
    (await items('#toc-all')).join('|') === 'Contents|Part A|A one|A two|Part B|B one',
    (await items('#toc-all')).join('|'),
  );
  t.ok(
    'toc nests level 2 under level 1',
    (await page.locator('#toc-all .slidev-toc-list-level-1 > li').count()) === 3 &&
      (await page.locator('#toc-all .slidev-toc-list-level-2 > li').count()) === 3,
  );
  t.ok('toc columns', (await style(page, '#toc-all > slide-ng-toc', 'columnCount')) === '2');
  t.ok(
    'toc maxDepth=1 and listClass',
    (await page.locator('#toc-top li').count()) === 3 &&
      (await page.locator('#toc-top ol.my-list').count()) === 1,
  );
  t.ok(
    'toc marks the current slide',
    (await page.locator('#toc-all .slidev-toc-item-active').count()) === 1,
  );
  await page.locator('#toc-all a', { hasText: 'A one' }).click();
  await page.waitForTimeout(200);
  t.ok('a toc link goes to its slide', pathOf(page) === '/22', pathOf(page));
  await page.goto(page.url().replace('/22', '/23'));
  await page.waitForFunction(() =>
    /slide 23/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  t.ok(
    'toc onlyCurrentTree shows the path to the current slide only',
    (await items('#toc-current')).join('|') === 'Part A|A two',
    (await items('#toc-current')).join('|'),
  );
  t.ok(
    'toc marks the active item and its parent',
    (await page.locator('#toc-current .slidev-toc-item-active').innerText()).startsWith('A two') &&
      (await page.locator('#toc-current .slidev-toc-item-parent-active').count()) === 1,
  );
  await page.close();

  // ---- built-in components (slide 26) -------------------------------------------------
  page = await open('/26');
  t.ok(
    'slide-ng-current-no and slide-ng-total',
    (await page.locator('#c-no').innerText()) === 'no 26 of 37',
    await page.locator('#c-no').innerText(),
  );
  t.ok(
    'slide-ng-light-or-dark shows the light content in light mode',
    (await page.locator('#c-light').count()) === 1 && (await page.locator('#c-dark').count()) === 0,
  );
  await press(page, 'd');
  t.ok(
    'slide-ng-light-or-dark switches with the colour mode',
    (await page.locator('#c-dark').count()) === 1 && (await page.locator('#c-light').count()) === 0,
  );
  await press(page, 'd');
  t.ok(
    'slide-ng-render-when slide shows its content on the slide, not the fallback',
    (await page.locator('#c-slide').count()) === 1 &&
      (await page.locator('#c-other').count()) === 0,
  );
  t.ok(
    'slide-ng-switch and slide-ng-click-gap give 6 clicks',
    (await hud(page)) === 'slide 26/37 clicks 0/6',
    await hud(page),
  );
  const shown = () =>
    page.evaluate(() =>
      ['sw1', 'sw2', 'sw3', 'after-gap']
        .filter((id) => {
          const e = document.getElementById(id);
          return (
            !e.classList.contains('slidev-vclick-display-none') &&
            !e.classList.contains('slidev-vclick-hidden')
          );
        })
        .join(','),
    );
  const expected = ['', 'sw1', 'sw2', 'sw3', '', '', 'after-gap'];
  for (let n = 0; n <= 6; n++) {
    if (n) await press(page, 'ArrowRight', 150);
    t.ok(
      `slide-ng-switch click ${n} shows [${expected[n]}]`,
      (await shown()) === expected[n],
      await shown(),
    );
  }
  await page.goto(page.url().split('?')[0].replace('/26', '/3'));
  await page.waitForFunction(() =>
    /slide 3\//.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.goBack();
  await page.waitForFunction(() =>
    /slide 26/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.locator('#c-link a').click();
  await page.waitForTimeout(200);
  t.ok('slide-ng-link goes to a slide number', pathOf(page) === '/3', pathOf(page));
  await page.goto(page.url().replace('/3?', '/26?'));
  await page.waitForFunction(() =>
    /slide 26/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.locator('#c-alias a').click();
  await page.waitForTimeout(200);
  t.ok(
    'slide-ng-link goes to a routeAlias, and the address uses the alias',
    pathOf(page) === '/the-alias' && (await hud(page)).startsWith('slide 27/'),
    pathOf(page) + ' ' + (await hud(page)),
  );
  // Markdown links: `[x](3)` moves inside the deck (the page is not loaded again), a web page opens in a new tab.
  await page.goto(page.url().replace('/the-alias', '/26').split('?')[0] + '?clicks=0');
  await page.waitForFunction(() =>
    /slide 26/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.evaluate(() => (window.__samePage = true));
  await page.locator('a', { hasText: 'markdown link to 3' }).click();
  await page.waitForTimeout(200);
  t.ok(
    'a markdown link [x](3) goes to slide 3 without loading the page again',
    pathOf(page) === '/3' &&
      (await hud(page)).startsWith('slide 3/') &&
      (await page.evaluate(() => window.__samePage === true)),
    pathOf(page) + ' ' + (await hud(page)),
  );
  await page.goBack();
  await page.waitForFunction(() =>
    /slide 26/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  await page.locator('a', { hasText: 'markdown link to the alias' }).click();
  await page.waitForTimeout(200);
  t.ok(
    'a markdown link [x](/alias) goes to the routeAlias slide',
    pathOf(page) === '/the-alias' && (await page.evaluate(() => window.__samePage === true)),
    pathOf(page),
  );
  await page.goBack();
  await page.waitForFunction(() =>
    /slide 26/.test(document.querySelector('#hud')?.innerText ?? ''),
  );
  const web = page.locator('a', { hasText: 'a web page' });
  t.ok(
    'a markdown link to a web page opens a new tab',
    (await web.getAttribute('target')) === '_blank' &&
      (await web.getAttribute('rel')) === 'noopener',
  );
  await page.close();

  page = await open('/3?clicks=0');
  await page.mouse.move(40, 700);
  await page.waitForTimeout(400);
  await page.locator('#nav-overview').click();
  const card = page.locator('.overview-card[data-no="26"]');
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  t.ok(
    'slide-ng-render-when shows the fallback in the overview',
    (await card.locator('#c-other').count()) === 1 &&
      (await card.locator('#c-slide').count()) === 0,
  );
  t.ok(
    'slide-ng-current-no inside a thumbnail knows its own slide',
    (await card.locator('#c-no').innerText()) === 'no 26 of 37',
  );
  await page.close();

  // ---- routeAlias, clicks override, scoped style, src import -----------------------------
  page = await open('/the-alias');
  t.ok(
    'an address can be a routeAlias',
    (await hud(page)).startsWith('slide 27/37'),
    await hud(page),
  );
  await page.close();
  page = await open('/28');
  t.ok(
    'clicks: 3 in the frontmatter sets the click total',
    (await hud(page)) === 'slide 28/37 clicks 0/3',
    await hud(page),
  );
  await page.close();
  page = await open('/29');
  t.ok(
    '<style> in a slide applies to that slide',
    (await style(page, 'h1', 'color')) === 'rgb(255, 0, 0)',
  );
  await page.close();
  page = await open('/30');
  t.ok(
    '<style> does not leak to other slides',
    (await style(page, 'h1', 'color')) !== 'rgb(255, 0, 0)',
  );
  await page.close();
  page = await open('/31');
  t.ok(
    'src: slide 31 comes from pages/extra.md, importer class wins',
    (await page.locator('h1').innerText()) === 'Imported one' &&
      (await page.locator('sn-center.from-main').count()) === 1,
  );
  await page.close();
  page = await open('/32');
  t.ok(
    'src: range #1-2 imports two slides',
    (await page.locator('h1').innerText()) === 'Imported two' &&
      (await hud(page)).startsWith('slide 32/37'),
  );
  await page.close();
}
