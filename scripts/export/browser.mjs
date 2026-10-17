// Starting Chromium through playwright-core (which does not bring a browser of its own).
import { chromium } from 'playwright-core';

/**
 * The Chromium sandbox stays on. A deck can embed iframes, scripts and pictures from anywhere, and the export opens it, so
 * the sandbox is the wall between the page and this machine. `--no-sandbox` (or SLIDE_NG_NO_SANDBOX=1) takes it away, which a
 * container or the root user needs because Chromium refuses to start there otherwise: export only decks you trust then.
 */
export const noSandboxWanted = (option) =>
  option === true || process.env.SLIDE_NG_NO_SANDBOX === '1';

/**
 * Playwright turns the sandbox off unless `chromiumSandbox: true` is given, so the setting is passed on purpose.
 * @param {{ noSandbox?: boolean }} [options]
 */
export const sandboxEnabled = ({ noSandbox } = {}) => !noSandboxWanted(noSandbox);

export async function launchBrowser(executablePath, { noSandbox } = {}) {
  try {
    return await chromium.launch({
      executablePath,
      chromiumSandbox: sandboxEnabled({ noSandbox }),
    });
  } catch (error) {
    // The usual cause is simply that no browser is installed; say how to fix it.
    const first = String(error.message).split('\n')[0];
    const sandbox = /sandbox|as root/i.test(String(error.message))
      ? '\nChromium refused to run with its sandbox (as root, or in a container). If you trust the deck, run again with `--no-sandbox`.'
      : '';
    // Only a missing browser needs the install hint; a sandbox refusal means the browser is there.
    const install = sandbox
      ? ''
      : '\nInstall one with `npx playwright-core install chromium`, or point to an existing Chrome or Chromium with\n' +
        '`--executable-path /path/to/chrome` (or the CHROME_PATH environment variable).';
    throw new Error(`Could not start Chromium (${first}).${sandbox}${install}`, { cause: error });
  }
}
