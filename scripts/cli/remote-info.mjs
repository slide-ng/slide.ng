// What `slide-ng --remote` prints, as lines of text (pure, so a test can read them). Like Slidev's start-up message:
// the public show, the private one (with the password in the address), the presenter and the addresses on the network.
// Remote mode always has a password (made at random when none was given) and the text says what that password allows.
import { renderUnicodeCompact } from 'uqr';

/** @param {{ port: number, password: string, addresses: string[], routerMode?: string, generated?: boolean, fromArgv?: boolean }} info */
export function remoteLines({ port, password, addresses, routerMode, generated, fromArgv }) {
  const slash = routerMode === 'hash' ? '/#/' : '/';
  const query = passwordQuery(password);
  const lines = [''];
  lines.push('[slide.ng] remote access is ON');
  if (generated)
    lines.push(`[slide.ng] no password was given: a random one was made for this run: ${password}`);
  for (const host of addresses.length ? addresses : ['<your address>']) {
    const base = `http://${host}:${port}`;
    lines.push(`[slide.ng]   public slide show:  ${base}${slash}`);
    lines.push(`[slide.ng]   private slide show: ${base}${slash}${query}`);
    lines.push(`[slide.ng]   presenter mode:     ${base}${slash}presenter/1${query}`);
  }
  lines.push(
    '[slide.ng] whoever has the password can edit your slides.md and the files imported with src:, save text into files that a `<<< ./file {monaco-write}` editor lists (never setup, package or hidden files), save drawings, and follow or move the presenter',
  );
  lines.push(
    '[slide.ng] there is no HTTPS: the password and the slides cross the network in the clear. Use a network you trust',
  );
  if (fromArgv)
    lines.push(
      '[slide.ng] note: a password on the command line shows in the process list; SLIDE_NG_PASSWORD or the prompt keeps it out',
    );
  lines.push('');
  return lines;
}

const passwordQuery = (password) => `?password=${encodeURIComponent(password)}`;

/**
 * The `c` key of `slide-ng dev --remote`: a QR code of the private slide show for each address, password included, so a
 * phone can open it with its camera (Slidev's `c`). Drawn with half blocks, two rows of the code per line of text.
 * @param {{ port: number, password: string, addresses: string[] }} info
 */
export function remoteQrLines({ port, password, addresses }) {
  if (!addresses.length) return ['[slide.ng] no network address found for a QR code'];
  return addresses.flatMap((host) => {
    const url = `http://${host}:${port}/${passwordQuery(password)}`;
    return ['', `[slide.ng] ${url}`, renderUnicodeCompact(url, { border: 2 }), ''];
  });
}
