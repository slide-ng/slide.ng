// `npm run test:e2e` (last part): the interface language (docs/UI-STRINGS.md). Builds two decks and checks them in a browser:
//   tests/e2e/i18n/slides.md       `lang: xx`, with locales/xx.json in the deck and in its theme: labels of the bar, the
//                                  settings menu, goto, overview, info, presenter and print come from the files, the rest is English;
//                                  `navPosition: top-right` puts its bar in the top right, with the menus below it
//   tests/e2e/i18n/rtl/slides.md   `lang: ar` with `uiLang: tr`: the built-in Turkish (isolated left to right), `dir="rtl"`, a
//                                  mirrored bar and overview, Arabic dates
//   tests/e2e/i18n/languages       `languages: { en, tr }`: the language menu switches the slides, `<html lang>`, the date
//                                  pipe and the interface at the same slide, in every window, and the choice survives a reload
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const decks = {
  i18n: 'tests/e2e/i18n/slides.md',
  'i18n-rtl': 'tests/e2e/i18n/rtl/slides.md',
  'i18n-languages': 'tests/e2e/i18n/languages/slides.md',
};
if (!process.env.SKIP_BUILD) {
  try {
    for (const [out, file] of Object.entries(decks))
      execSync(
        `node scripts/generate.mjs && node node_modules/@angular/cli/bin/ng.js build --output-path dist/${out}`,
        { stdio: 'inherit', env: { ...process.env, SLIDES_FILE: file } },
      );
  } finally {
    execSync('node scripts/generate.mjs', { stdio: 'ignore' }); // put the generated files of the normal deck back
  }
}

const browser = await launch();
const t = reporter();
const problems = [];

// A page that has no #hud (the print routes): wait until it says it is drawn.
async function openPrint(base, url) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => problems.push(String(e)));
  await page.goto(base + url);
  await page.waitForSelector('[data-slide-ng-print="ready"]', { timeout: 20000 });
  return page;
}
const title = (page, selector) => page.locator(selector).first().getAttribute('title');

// ---- lang: xx, translated by the deck and its theme
{
  const { server, port } = await serve('dist/i18n/browser');
  const base = `http://localhost:${port}`;
  const ctx = makeContext(base, browser, t);
  const { open, press } = ctx;
  console.log('\n== lang: xx');

  const page = await open('/1');
  const html = await page.evaluate(() => [document.documentElement.lang, document.dir]);
  t.ok('<html lang="xx">, left to right', html[0] === 'xx' && html[1] === '', html.join('|'));
  t.ok('bar: the deck translates "next"', (await title(page, '#nav-next')) === 'xx-next');
  t.ok(
    'bar: the theme translates "previous"',
    (await title(page, '#nav-prev')) === 'xx-prev (theme)',
  );
  t.ok(
    'bar: the deck wins over the theme key by key',
    (await title(page, '#nav-overview')) === 'xx-overview (deck)',
  );
  t.ok(
    'a deck in one language has no language button',
    (await page.locator('#nav-language').count()) === 0,
  );
  t.ok(
    'bar: a key nobody translated stays English',
    (await title(page, '#nav-info')) === 'Show info',
  );
  t.ok(
    'the number pipe has no locale data for xx and formats in English',
    (await page.locator('.slidev-layout').first().innerText()).includes('1,234.5'),
  );

  const box = await page.locator('.nav-bar-box').boundingBox();
  t.ok(
    'navPosition: top-right puts the bar in the top right',
    box !== null && box.y < 2 && Math.abs(box.x + box.width - 1280) < 2,
    JSON.stringify(box),
  );
  await page.locator('#nav-settings').click();
  await page.locator('#settings-menu').waitFor();
  const [button, menu] = await Promise.all(
    ['#nav-settings', '#settings-menu'].map((s) => page.locator(s).boundingBox()),
  );
  t.ok(
    'navPosition: at the top, the settings menu opens below the bar and stays in the window',
    button !== null &&
      menu !== null &&
      menu.y > button.y + button.height / 2 &&
      menu.y + menu.height <= 720 &&
      menu.x >= 0 &&
      menu.x + menu.width <= 1280,
    JSON.stringify({ button, menu }),
  );
  t.ok(
    'settings menu: translated title',
    (await page.locator('#settings-menu').innerText()).includes('xx-cursor-style'),
  );
  t.ok(
    'settings menu: untranslated titles are English',
    (await page.locator('#settings-menu').innerText()).includes('Slide Scale'),
  );
  await page.locator('#nav-settings').click();

  await press(page, 'g', 300);
  t.ok(
    'goto: translated placeholder',
    (await page.locator('#slidev-goto-input').getAttribute('placeholder')) === 'xx-goto',
  );
  await press(page, 'Escape');

  await press(page, 'o', 400);
  t.ok(
    'overview: translated dialog label and card labels',
    (await page.locator('#overview').getAttribute('aria-label')) === 'xx-overview-dialog' &&
      (await page.locator('.overview-card').nth(1).getAttribute('aria-label')) === 'xx-go 2: Two',
  );
  await press(page, 'Escape');

  await page.locator('#nav-info').click();
  t.ok(
    'info: the credit is translated around the bold name',
    (await page.locator('#info-credit').innerText()).replace(/\s+/g, ' ').trim() ===
      'xx slide.ng xx-credit',
    await page.locator('#info-credit').innerText(),
  );
  await page.close();

  const presenter = await open('/presenter/2');
  const text = await presenter.locator('.slidev-presenter').innerText();
  t.ok('presenter: "no notes" with the slide number', text.includes('xx-no-notes 2'));
  t.ok('presenter: the "next" label', text.includes('xx-next-step'));
  t.ok('presenter: the tab title', (await presenter.title()) === 'xx-presenter Interface text');
  t.ok(
    'presenter: the timer button',
    (await presenter.locator('#timer-reset').getAttribute('aria-label')) === 'xx-reset',
  );
  t.ok(
    'presenter: the bar uses the same texts',
    (await title(presenter, '#nav-next')) === 'xx-next',
  );
  await presenter.close();

  const notes = await openPrint(base, '/presenter/print');
  t.ok(
    'print: the notes page has a translated title',
    (await notes.title()) === 'xx-notes Interface text',
  );
  t.ok(
    'print: the notes page is a main landmark',
    (await notes.locator('main#notes-print').count()) === 1,
  );
  await notes.close();
  const print = await openPrint(base, '/print');
  t.ok(
    'print: the slides are printed with the deck language',
    (await print.evaluate(() => document.documentElement.lang)) === 'xx' &&
      (await print.locator('#print-content').innerText()).includes('1,234.5'),
  );
  await print.close();
  problems.push(...ctx.problems);
  server.close();
}

// ---- lang: ar with uiLang: tr
{
  const { server, port } = await serve('dist/i18n-rtl/browser');
  const base = `http://localhost:${port}`;
  const ctx = makeContext(base, browser, t);
  console.log('\n== lang: ar, uiLang: tr');

  const page = await ctx.open('/1');
  const html = await page.evaluate(() => [document.documentElement.lang, document.dir]);
  t.ok('<html lang="ar" dir="rtl">', html[0] === 'ar' && html[1] === 'rtl', html.join('|'));
  // Turkish runs left to right in a right-to-left page: every text is an LTR isolate (LRI ... PDI), so it keeps its order.
  t.ok(
    'uiLang: tr shows the built-in Turkish, isolated left to right',
    (await title(page, '#nav-next')) === '\u2066Sonraki slayta git\u2069' &&
      (await title(page, '#nav-settings')) === '\u2066Diğer seçenekler\u2069',
    await title(page, '#nav-next'),
  );
  t.ok(
    'LOCALE_ID follows lang: the date pipe writes the Arabic month',
    (await page.locator('#month').innerText()).trim() === 'يناير',
    await page.locator('#month').innerText(),
  );
  // The bar sits in the bottom right corner and its first button (fullscreen) is on the right.
  const bar = await page.locator('app-nav-bar').boundingBox();
  const full = await page.locator('#nav-fullscreen').boundingBox();
  const next = await page.locator('#nav-next').boundingBox();
  t.ok(
    'the bar is mirrored: in the right corner, running from right to left',
    bar.x > 640 && full.x > next.x,
    JSON.stringify({ bar: bar.x, full: full.x, next: next.x }),
  );
  const quote = await page
    .locator('#slide-content blockquote')
    .evaluate((e) => [getComputedStyle(e).borderLeftWidth, getComputedStyle(e).borderRightWidth]);
  t.ok(
    'a blockquote has its line on the right',
    quote[0] === '0px' && quote[1] === '1px',
    quote.join('|'),
  );
  // The overview grid is mirrored, so its arrows are too: left goes to the next card (on the left).
  await page.keyboard.press('o');
  await page.waitForSelector('#overview', { timeout: 5000 });
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Enter');
  await page.waitForURL((url) => url.pathname === '/2', { timeout: 5000 }).catch(() => {});
  t.ok(
    'overview: ArrowLeft goes to the next card in a mirrored grid',
    new URL(page.url()).pathname === '/2',
    page.url(),
  );
  // Mermaid lays out its labels for left-to-right text, so its drawing stays left to right (the legend text would run over its boxes).
  await page.waitForSelector('#slide-content .mermaid svg', { timeout: 10000 });
  t.ok(
    'a Mermaid drawing stays left to right',
    (await page
      .locator('#slide-content .mermaid svg')
      .evaluate((e) => getComputedStyle(e).direction)) === 'ltr',
  );
  await page.close();

  const presenter = await ctx.open('/presenter/2');
  t.ok(
    'presenter: Turkish labels',
    (await presenter.locator('.slidev-presenter').innerText()).includes('2. slayt için not yok.'),
  );
  await presenter.close();

  const print = await openPrint(base, '/print');
  t.ok(
    'print: the Arabic month is printed too',
    (await print.locator('#month').innerText()).trim() === 'يناير',
  );
  await print.close();
  problems.push(...ctx.problems);
  server.close();
}

// ---- languages: { en: slides.md, tr: slides.tr.md }
{
  const { server, port } = await serve('dist/i18n-languages/browser');
  const base = `http://localhost:${port}`;
  const ctx = makeContext(base, browser, t);
  const { open, until } = ctx;
  console.log('\n== languages: en, tr');
  // Windows of one browser: they share the stored choice.
  const group = await ctx.windowGroup();
  const shown = (page) =>
    page.evaluate(() => ({
      h1: document.querySelector('#slide-content h1')?.textContent?.trim(),
      lang: document.documentElement.lang,
      path: location.pathname,
      title: document.title,
      next: document.querySelector('#nav-next')?.getAttribute('title'),
    }));
  // A switch loads the page again: wait for the new one to draw its slide.
  const reloaded = (page) =>
    page.waitForFunction(
      () => /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
      null,
      { timeout: 20000 },
    );

  const page = await open('/1', undefined, undefined, group);
  let now = await shown(page);
  t.ok(
    "starts in the entry file's language",
    now.lang === 'en' && now.h1 === 'Hello',
    JSON.stringify(now),
  );
  t.ok(
    'English dates and numbers',
    (await page.locator('#date').innerText()) === 'March 5, 2026' &&
      (await page.locator('#number').innerText()) === '1,234.5',
  );
  await page.keyboard.press('ArrowRight');
  // Slide 2 has a routeAlias, so its address is /second.
  await until(page, () => location.pathname === '/second');
  const presenter = await open('/presenter/2', undefined, undefined, group);

  await page.locator('#nav-language').click();
  await page.locator('#language-menu').waitFor();
  const options = await page
    .locator('#language-menu [role=menuitemradio]')
    .evaluateAll((all) => all.map((o) => [o.textContent.trim(), o.getAttribute('aria-checked')]));
  t.ok(
    'the menu names each language in its own language and ticks the current one',
    JSON.stringify(options) ===
      JSON.stringify([
        ['English', 'true'],
        ['Türkçe', 'false'],
      ]),
    JSON.stringify(options),
  );
  t.ok(
    'the menu opens on the current language',
    await page.evaluate(() => document.activeElement?.getAttribute('data-lang') === 'en'),
  );
  const presenterReloaded = presenter.waitForEvent('load', { timeout: 20000 });
  await Promise.all([
    page.waitForEvent('load', { timeout: 20000 }),
    page.locator('#language-menu [data-lang=tr]').click(),
  ]);
  await reloaded(page);
  now = await shown(page);
  t.ok(
    'Turkish: the same slide and address, <html lang="tr">, the Turkish title',
    now.path === '/second' &&
      now.h1 === 'İkinci slayt' &&
      now.lang === 'tr' &&
      now.title.includes('Diller'),
    JSON.stringify(now),
  );
  t.ok('Turkish: the interface text', now.next === 'Sonraki slayta git', now.next);
  t.ok(
    "Turkish: the slide keeps the English slide's frontmatter (layout: center)",
    (await page.locator('#layout').innerText()) === 'center',
  );
  await presenterReloaded;
  await reloaded(presenter);
  t.ok(
    'the presenter window of the same browser switched too',
    await until(
      presenter,
      () =>
        document.documentElement.lang === 'tr' &&
        document.querySelector('.slidev-presenter')?.textContent?.includes('İkinci slayt'),
    ),
  );
  await presenter.close();

  await page.goto(`${base}/1`);
  await reloaded(page);
  t.ok(
    'Turkish dates and numbers (LOCALE_ID tr)',
    (await page.locator('#date').innerText()) === '5 Mart 2026' &&
      (await page.locator('#number').innerText()) === '1.234,5',
    `${await page.locator('#date').innerText()} ${await page.locator('#number').innerText()}`,
  );
  await page.goto(`${base}/3`);
  await reloaded(page);
  now = await shown(page);
  t.ok(
    'a slide with no Turkish counterpart shows the English one',
    now.h1 === 'Only in English',
    JSON.stringify(now),
  );
  await page.reload();
  await reloaded(page);
  now = await shown(page);
  t.ok(
    'the choice survives a reload',
    now.lang === 'tr' && now.next === 'Sonraki slayta git',
    JSON.stringify(now),
  );

  // The keyboard: Enter opens the menu on the ticked language, the arrows move, Escape closes it back onto the button.
  await page.goto(`${base}/2`);
  await reloaded(page);
  await page.locator('#nav-language').focus();
  await page.keyboard.press('Enter');
  await page.locator('#language-menu').waitFor();
  await page.keyboard.press('ArrowUp');
  t.ok(
    'ArrowUp moves to English, and the slide stays',
    await page.evaluate(
      () =>
        document.activeElement?.getAttribute('data-lang') === 'en' && location.pathname === '/2',
    ),
  );
  await page.keyboard.press('Escape');
  t.ok(
    'Escape closes the menu and focuses the button',
    await until(
      page,
      () =>
        !document.querySelector('#language-menu') && document.activeElement?.id === 'nav-language',
    ),
  );
  await page.keyboard.press('Enter');
  await page.locator('#language-menu').waitFor();
  await page.keyboard.press('ArrowDown');
  await Promise.all([page.waitForEvent('load', { timeout: 20000 }), page.keyboard.press('Enter')]);
  await reloaded(page);
  now = await shown(page);
  t.ok(
    'Enter on English switches back, at the same slide',
    now.lang === 'en' && now.h1 === 'Second slide' && now.path === '/2',
    JSON.stringify(now),
  );
  await page.close();
  await group.close();

  // Another browser has its own choice: it starts in English.
  const other = await open('/2');
  now = await shown(other);
  t.ok(
    "another browser starts in the entry file's language",
    now.lang === 'en',
    JSON.stringify(now),
  );
  await other.close();
  problems.push(...ctx.problems);
  server.close();
}

t.ok('no console errors or warnings', problems.length === 0, JSON.stringify(problems));
await browser.close();
process.exit(t.done());
