// Helpers shared by the showcase browser tests: open a page, press keys, read the readout.
import { consoleProblem } from '../console-problem.mjs';
export function makeContext(base, browser, t) {
  const problems = []; // console errors and warnings, must stay empty
  // `before(page)` can set up the page (routes, init scripts) before it loads.
  // `from` is a browser context: pages of one context share storage and BroadcastChannel (they are "windows of one browser").
  async function open(
    url,
    size = { width: 1280, height: 720 },
    before = async () => {},
    from = null,
  ) {
    const page = from ? await from.newPage() : await browser.newPage({ viewport: size });
    if (from) await page.setViewportSize(size);
    page.on('console', (m) => {
      const problem = consoleProblem(m);
      if (problem) problems.push(problem);
    });
    page.on('pageerror', (e) => problems.push(String(e)));
    await before(page);
    await page.goto(base + url);
    await page.waitForFunction(() =>
      /clicks \d+\/\d+/.test(document.querySelector('#hud')?.innerText ?? ''),
    );
    await page.waitForTimeout(150);
    return page;
  }
  const press = async (page, key, wait = 200) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
  };
  // Waits until `fn` (run in the page, with `arg`) returns a truthy value, up to `timeout` ms.
  // Gives false on timeout, so the check that follows reports the failure instead of a crash.
  const until = (page, fn, arg, timeout = 5000) =>
    page
      .waitForFunction(fn, arg, { timeout })
      .then(() => true)
      .catch(() => false);
  const hud = async (page) => (await page.locator('#hud').innerText()).trim();
  const pathOf = (page) => new URL(page.url()).pathname;
  const clicksOf = (page) => new URL(page.url()).searchParams.get('clicks');
  // The element's computed style value.
  const style = (page, selector, prop) =>
    page
      .locator(selector)
      .first()
      .evaluate((e, p) => getComputedStyle(e)[p], prop);
  // A fresh browser context for tests that need two windows of one browser.
  const windowGroup = (options = {}) =>
    browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
  return {
    t,
    base,
    browser,
    problems,
    open,
    press,
    until,
    hud,
    pathOf,
    clicksOf,
    style,
    windowGroup,
  };
}
