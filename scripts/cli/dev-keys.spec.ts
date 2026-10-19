import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { editorCommand, keyHint, listenForKeys, openCommand } from './dev-keys.mjs';

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
  it('ignores keys while paused, and stop removes the listener', async () => {
    const { input, modes } = fakeStdin();
    const calls: string[] = [];
    const keys = listenForKeys(input, { open: () => calls.push('open') });
    keys.pause();
    input.write('o');
    await tick();
    keys.resume();
    input.write('o');
    await tick();
    keys.stop();
    input.write('o');
    await tick();
    expect(calls).toEqual(['open']);
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
    expect(openCommand('http://x/', 'win32').command).toBe('cmd');
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
