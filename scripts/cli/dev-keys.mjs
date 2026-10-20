// Keys typed in the terminal while `slide-ng dev` runs, like Slidev's dev server (packages/slidev/node/cli.ts):
// r restarts, o opens the browser, e opens the entry in the editor, q quits, c prints a QR code of the remote address.
// Only used when stdin is a terminal; `input` is a parameter so a test can type into a fake one.
import { spawn } from 'node:child_process';
import { emitKeypressEvents } from 'node:readline';

export const DEV_KEYS = [
  { key: 'r', action: 'restart', label: 'restart' },
  { key: 'o', action: 'open', label: 'open' },
  { key: 'e', action: 'edit', label: 'edit' },
  { key: 'q', action: 'quit', label: 'quit' },
  { key: 'c', action: 'qrcode', label: 'qr code' },
];

/** The line printed at start-up. The QR code needs `--remote` (there is no address to show without it). */
export function keyHint(remote) {
  const keys = DEV_KEYS.filter((k) => remote || k.action !== 'qrcode');
  return `[slide.ng] shortcuts: ${keys.map((k) => `${k.key} ${k.label}`).join(' | ')}`;
}

/**
 * Calls `actions[name]()` for each key typed on `input`; Ctrl+C calls `actions.interrupt`. Returns `pause` and `resume`
 * (for a program that needs the terminal, such as an editor in it) and `stop`.
 * @param {NodeJS.ReadableStream & { isTTY?: boolean, setRawMode?: (on: boolean) => void }} input
 * @param {Record<string, () => unknown>} actions
 * @param {(error: unknown) => void} [onError]
 */
export function listenForKeys(input, actions, onError = () => {}) {
  emitKeypressEvents(input);
  const raw = (on) => input.isTTY && input.setRawMode?.(on);
  let paused = false;
  const onKey = (text, key = {}) => {
    if (key.ctrl && key.name === 'c') return actions.interrupt?.();
    if (paused || key.ctrl || key.meta) return;
    const found = DEV_KEYS.find((k) => k.key === text);
    if (!found || !actions[found.action]) return;
    try {
      Promise.resolve(actions[found.action]()).catch(onError);
    } catch (error) {
      onError(error);
    }
  };
  raw(true);
  input.on('keypress', onKey);
  input.resume();
  return {
    // While another program (the `e` editor) owns the terminal, stdin is not read at all, so no key is taken from it.
    pause() {
      paused = true;
      raw(false);
      input.pause();
    },
    resume() {
      paused = false;
      raw(true);
      input.resume();
    },
    stop() {
      input.off('keypress', onKey);
      raw(false);
      input.pause();
    },
  };
}

/** How to open an address in the default browser on this system. */
export function openCommand(url, platform = process.platform) {
  if (platform === 'darwin') return { command: 'open', args: [url] };
  // cmd's `start` (startProgram runs it through cmd); the empty first argument is the window title.
  if (platform === 'win32') return { command: 'start', args: ['', url] };
  return { command: 'xdg-open', args: [url] };
}

/** The editor for the `e` key: `$VISUAL` or `$EDITOR` (it may carry flags, such as `code -w`), else VS Code's `code`. */
export function editorCommand(file, env = process.env) {
  const words = String(env.VISUAL || env.EDITOR || 'code')
    .trim()
    .split(/\s+/);
  return { command: words[0], args: [...words.slice(1), file] };
}

/**
 * The line cmd.exe runs for `command` and `args` on Windows (`code` and the like are .cmd files, which only cmd can
 * start). Each argument is quoted unless it is a plain word, so a space does not split it, and with no quote inside it
 * cmd stays inside the quotes, where `& | < > ( ) ^` do nothing (also when a .cmd file passes `%*` on). `%` is taken
 * out of the quotes and escaped (`"^%"`), so no variable is expanded; `!` needs `/v:off` (startProgram passes it).
 * A quote or a line break cannot be kept inside one argument and is refused; Windows paths have neither.
 */
export function windowsCommandLine(command, args) {
  return [command, ...args]
    .map((arg) => {
      arg = String(arg);
      if (/["\r\n\0]/.test(arg))
        throw new Error(`cannot pass a quote or a line break to a program: ${arg}`);
      if (/^[\w.:/\\-]+$/.test(arg)) return arg;
      // Backslashes before a quote this adds (around a `%`, at the end) are doubled, so they stay backslashes.
      return `"${arg.replace(/(\\*)(%|$)/g, (_, slashes, end) => slashes + slashes + (end && '"^%"'))}"`;
    })
    .join(' ');
}

/** Starts a program without waiting for it; `done` is called when it ends or cannot start. */
export function startProgram({ command, args }, { inherit = false, done = () => {} } = {}) {
  const options = { stdio: inherit ? 'inherit' : 'ignore', detached: !inherit };
  let child;
  if (process.platform === 'win32') {
    // Through cmd, with the line quoted by windowsCommandLine (Node's `shell: true` joins the arguments unquoted).
    let line;
    try {
      line = windowsCommandLine(command, args);
    } catch (error) {
      return done(error);
    }
    const cmd = process.env.ComSpec || 'cmd.exe';
    child = spawn(cmd, ['/d', '/v:off', '/s', '/c', `"${line}"`], {
      ...options,
      windowsVerbatimArguments: true,
    });
  } else {
    child = spawn(command, args, options);
  }
  child.on('error', (error) => done(error));
  child.on('exit', () => done(null));
  if (!inherit) child.unref();
  return child;
}
