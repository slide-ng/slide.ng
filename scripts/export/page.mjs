// Opening the print page and waiting until it is finished (everything lazy has arrived).

/** Query string of the print page for one batch of slides. */
export function printQuery({ withClicks, range }) {
  const q = new URLSearchParams({ print: withClicks ? 'clicks' : 'true' });
  if (range) q.set('range', range);
  return q.toString();
}

/** Address of the print page. A deck built with `routerMode: hash` keeps the route after a #. */
export function printUrl({ origin, base = '/', routerMode, query, path = 'print' }) {
  return routerMode === 'hash'
    ? `${origin}${base}#/${path}?${query}`
    : `${origin}${base}${path}?${query}`;
}

/**
 * Loads a print page and waits for it. Anything that is still not there after `timeout` is reported with
 * `warn` and the exit code becomes 1, but the export goes on (a missing picture beats no export).
 */
export async function loadPrintPage(page, { url, dark, timeout, waitUntil, wait, warn }) {
  await page.emulateMedia({ colorScheme: dark ? 'dark' : 'light', media: 'screen' });
  try {
    await page.goto(url, { waitUntil, timeout });
  } catch (e) {
    // A live page in an iframe (or a video) keeps the network busy, so "networkidle" never comes.
    if (/Timeout/i.test(String(e?.message)) && waitUntil === 'networkidle')
      throw new Error(
        `the print page was still loading after ${Math.round(timeout / 1000)} s: a slide keeps the network busy (an iframe of a live site, a stream); run again with --wait-until load (and --wait 3000 if parts arrive late)`,
        { cause: e },
      );
    throw e;
  }
  await page.locator('[data-slide-ng-print="ready"]').waitFor({ state: 'attached', timeout });

  // Mermaid, Monaco, Magic Move, slide-ng-mark and the code runner mark themselves with `data-slide-ng-waitfor` until done.
  try {
    await page.waitForFunction(() => !document.querySelector('[data-slide-ng-waitfor]'), null, {
      timeout,
    });
  } catch {
    const left = await page.evaluate(() =>
      [...document.querySelectorAll('[data-slide-ng-waitfor]')].map(
        (e) => `${e.localName} (waiting for ${e.getAttribute('data-slide-ng-waitfor')})`,
      ),
    );
    warn(`these elements did not finish loading: ${left.join(', ')}`);
    process.exitCode = 1;
  }
  // Fonts and iframes (video embeds) have their own loading.
  await page.evaluate(() => document.fonts.ready);
  await Promise.all(
    page.frames().map((f) => f.waitForLoadState(undefined, { timeout }).catch(() => {})),
  );
  // Monaco keeps a hidden accessibility box that would show in a picture.
  await page.addStyleTag({ content: '.monaco-aria-container { display: none !important; }' });
  if (wait) await page.waitForTimeout(wait);
}

/**
 * Takes the address off links that lead to `origin`, the temporary server the export reads the deck from (`/3`, `/file.pdf`,
 * `tokens`): in a PDF they would point at a server that is gone. Links to a slide (`#slide-ng-page-2`) and to other sites stay.
 */
export function dropServerLinks(page, origin) {
  return page.evaluate((origin) => {
    for (const a of document.querySelectorAll('a[href]')) {
      if (a.getAttribute('href').startsWith('#')) continue;
      try {
        if (new URL(a.getAttribute('href'), document.baseURI).origin === origin)
          a.removeAttribute('href');
      } catch {
        // not an address: Chromium makes no link of it either
      }
    }
  }, origin);
}

/**
 * Takes the address off links to a slide (`#slide-ng-page-2`). For `--per-slide`, whose PDFs of one slide each are joined
 * without their named destinations: Chromium already leaves out a link to a slide of another batch, but one to the slide
 * itself (a table of contents on the slide it lists) stayed as a link to nowhere.
 */
export function dropSlideLinks(page) {
  return page.evaluate(() => {
    for (const a of document.querySelectorAll('a[href^="#"]')) a.removeAttribute('href');
  });
}

/** The pages of the print page in order: `{ no, id }` for each `.print-slide-container`. */
export function listPages(page) {
  return page
    .locator('.print-slide-container')
    .evaluateAll((list) =>
      list.map((e) => ({ id: e.id, no: Number(e.getAttribute('data-slide-ng-no')) })),
    );
}
