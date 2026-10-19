// `npm run test:e2e` (last part): the interface language (docs/UI-STRINGS.md). Builds two decks and checks them in a browser:
//   tests/e2e/i18n/slides.md       `lang: xx`, with locales/xx.json in the deck and in its theme: labels of the bar, the
//                                  settings menu, goto, overview, info, presenter and print come from the files, the rest is English
//   tests/e2e/i18n/rtl/slides.md   `lang: ar` with `uiLang: tr`: the built-in Turkish, `dir="rtl"`, a mirrored bar, Arabic dates
import { execSync } from 'node:child_process';
import { launch, reporter, serve } from './browser.mjs';
import { makeContext } from './helpers.mjs';

const decks = { i18n: 'tests/e2e/i18n/slides.md', 'i18n-rtl': 'tests/e2e/i18n/rtl/slides.md' };
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
    'bar: a key nobody translated stays English',
    (await title(page, '#nav-info')) === 'Show info',
  );
  t.ok(
    'the number pipe has no locale data for xx and formats in English',
    (await page.locator('.slidev-layout').first().innerText()).includes('1,234.5'),
  );

  await page.locator('#nav-settings').click();
  await page.locator('#settings-menu').waitFor();
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
      (await page.locator('.overview-card').nth(1).getAttribute('aria-label')) === 'xx-go 2',
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
  t.ok(
    'uiLang: tr shows the built-in Turkish',
    (await title(page, '#nav-next')) === 'Sonraki slayta git' &&
      (await title(page, '#nav-settings')) === 'Diğer seçenekler',
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

t.ok('no console errors or warnings', problems.length === 0, JSON.stringify(problems));
await browser.close();
process.exit(t.done());
