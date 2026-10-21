import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import {
  editorCommand,
  keyHint,
  listenForKeys,
  openCommand,
  windowsCommandLine,
} from './dev-keys.mjs';

// A fake terminal: what is written to it arrives as typed keys.
const fakeStdin = () => {
  const modes: boolean[] = [];
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode(on: boolean) {
      modes.push(on);
    },
  });
  return { input, modes };
};
const tick = () => new Promise((done) => setTimeout(done, 10));

describe('listenForKeys', () => {
  it('calls the action of each key and ignores other keys', async () => {
    const { input, modes } = fakeStdin();
    const calls: string[] = [];
    const action = (name: string) => () => calls.push(name);
    listenForKeys(input, {
      restart: action('restart'),
      open: action('open'),
      edit: action('edit'),
      quit: action('quit'),
      qrcode: action('qrcode'),
    });
    input.write('roexcq');
    await tick();
    expect(calls).toEqual(['restart', 'open', 'edit', 'qrcode', 'quit']);
    expect(modes).toEqual([true]);
  });
  it('treats Ctrl+C as an interrupt, not as c', async () => {
    const { input } = fakeStdin();
    const calls: string[] = [];
    listenForKeys(input, {
      interrupt: () => calls.push('interrupt'),
      qrcode: () => calls.push('qrcode'),
    });
    input.write('\x03');
    await tick();
    expect(calls).toEqual(['interrupt']);
  });
  it('stops reading while paused (the editor gets the keys), and stop removes the listener', async () => {
    const { input, modes } = fakeStdin();
    const calls: string[] = [];
    const keys = listenForKeys(input, { open: () => calls.push('open') });
    keys.pause();
    expect(input.isPaused()).toBe(true);
    keys.resume();
    expect(input.isPaused()).toBe(false);
    input.write('o');
    await tick();
    keys.stop();
    input.write('o');
    await tick();
    expect(calls).toEqual(['open']);
    expect(modes).toEqual([true, false, true, false]);
  });
  it('sets raw mode again after a process put the terminal back in line mode, unless paused', async () => {
    const { input, modes } = fakeStdin();
    const keys = listenForKeys(input, {});
    keys.restoreRaw();
    expect(modes).toEqual([true, false, true]);
    keys.pause();
    keys.restoreRaw();
    expect(modes).toEqual([true, false, true, false]);
  });
  it('reports an action that fails instead of throwing', async () => {
    const { input } = fakeStdin();
    const errors: unknown[] = [];
    listenForKeys(
      input,
      {
        restart: () => Promise.reject(new Error('busy')),
        open: () => {
          throw new Error('no browser');
        },
      },
      (e) => errors.push((e as Error).message),
    );
    input.write('ro');
    await tick();
    expect(errors.sort()).toEqual(['busy', 'no browser']);
  });
});

describe('keyHint', () => {
  it('lists the keys, the QR code only with --remote', () => {
    expect(keyHint(false)).toBe('[slide.ng] shortcuts: r restart | o open | e edit | q quit');
    expect(keyHint(true)).toContain('| c qr code');
  });
});

describe('programs', () => {
  it('opens the browser with the command of the system', () => {
    expect(openCommand('http://x/', 'darwin')).toEqual({ command: 'open', args: ['http://x/'] });
    expect(openCommand('http://x/', 'linux')).toEqual({ command: 'xdg-open', args: ['http://x/'] });
    expect(openCommand('http://x/', 'win32')).toEqual({
      command: 'start',
      args: ['', 'http://x/'],
    });
  });
  it('uses VISUAL or EDITOR with their flags, else code', () => {
    expect(editorCommand('/d/slides.md', {})).toEqual({ command: 'code', args: ['/d/slides.md'] });
    expect(editorCommand('/d/s.md', { EDITOR: 'code -w' })).toEqual({
      command: 'code',
      args: ['-w', '/d/s.md'],
    });
    expect(editorCommand('/d/s.md', { EDITOR: 'nano', VISUAL: 'vim' }).command).toBe('vim');
  });
});

describe('windowsCommandLine', () => {
  it('leaves plain words bare, so cmd builtins such as start still work', () => {
    expect(windowsCommandLine('code', ['-w', 'C:\\d\\slides.md'])).toBe('code -w C:\\d\\slides.md');
    expect(windowsCommandLine('start', ['', 'http://localhost:3030/'])).toBe(
      'start "" http://localhost:3030/',
    );
  });
  it('quotes a path with spaces as one argument', () => {
    expect(windowsCommandLine('code', ['C:\\my talks\\slides.md'])).toBe(
      'code "C:\\my talks\\slides.md"',
    );
    expect(windowsCommandLine('C:\\Program Files\\vim.exe', ['a b'])).toBe(
      '"C:\\Program Files\\vim.exe" "a b"',
    );
  });
  it('keeps & | < > ( ) ^ inside quotes, where cmd does not act on them', () => {
    expect(windowsCommandLine('code', ['C:\\Q&A\\slides.md'])).toBe('code "C:\\Q&A\\slides.md"');
    expect(windowsCommandLine('code', ['a^b|c<d>(e)'])).toBe('code "a^b|c<d>(e)"');
  });
  it('takes % out of the quotes and escapes it, so no variable is expanded', () => {
    expect(windowsCommandLine('code', ['C:\\%PATH%\\s.md'])).toBe(
      'code "C:\\\\"^%"PATH"^%"\\s.md"',
    );
    expect(windowsCommandLine('code', ['100%'])).toBe('code "100"^%""');
  });
  it('doubles the backslashes before a closing quote', () => {
    expect(windowsCommandLine('code', ['C:\\my dir\\'])).toBe('code "C:\\my dir\\\\"');
  });
  it('refuses a quote or a line break, which cmd cannot keep inside one argument', () => {
    expect(() => windowsCommandLine('code', ['say "hi" & calc'])).toThrow(/quote or a line break/);
    expect(() => windowsCommandLine('code', ['a\nb'])).toThrow(/quote or a line break/);
  });
});
