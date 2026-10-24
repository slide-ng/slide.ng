import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deckRouterMode, devPlan, ngServeArgs, ngServeEnv } from './dev.mjs';

describe('devPlan', () => {
  it('has sensible defaults', () => {
    const plan = devPlan([], {});
    expect(plan).toMatchObject({
      port: 4230,
      portGiven: false,
      open: false,
      remote: false,
      password: '',
      log: 'info',
      force: false,
    });
    expect(plan.entry.endsWith('slides.md')).toBe(true);
    expect(plan.host).toBeUndefined();
  });
  it('remembers whether the port was asked for', () => {
    expect(devPlan(['--port', '4230']).portGiven).toBe(true);
    expect(devPlan(['-p', '5000']).port).toBe(5000);
  });
  it('reads --lang', () => {
    expect(devPlan(['--lang', 'tr']).lang).toBe('tr');
    expect(devPlan([]).lang).toBeUndefined();
  });
  it('reads --theme and its alias', () => {
    expect(devPlan(['--theme', './t']).theme).toBe('./t');
    expect(devPlan(['-t', 'x']).theme).toBe('x');
  });
  it('reads the entry file and the flags', () => {
    const plan = devPlan(['talk/my.md', '--port', '4300', '--open', '--log=warn', '--force']);
    expect(plan).toMatchObject({ port: 4300, open: true, log: 'warn', force: true });
    expect(plan.entry.endsWith('talk/my.md')).toBe(true);
  });
  it('--remote listens on every address and always has a password', () => {
    const named = devPlan(['--remote=secret'], {});
    expect(named).toMatchObject({ remote: true, password: 'secret', host: '0.0.0.0' });
    expect(named.passwordGenerated).toBe(false);
    expect(named.passwordFrom).toBe('argv');
  });
  it('--remote without a password makes a random one of at least 16 characters, new each time', () => {
    const a = devPlan(['--remote'], {});
    const b = devPlan(['--remote='], {});
    expect(a).toMatchObject({ remote: true, passwordGenerated: true });
    expect(a.password.length).toBeGreaterThanOrEqual(16);
    expect(b.password.length).toBeGreaterThanOrEqual(16);
    expect(a.password).not.toBe(b.password);
    expect(a.password).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('SLIDE_NG_PASSWORD gives the password for --remote; argv wins', () => {
    const env = { SLIDE_NG_PASSWORD: 'from-env-12345678' };
    expect(devPlan(['--remote'], env)).toMatchObject({
      password: 'from-env-12345678',
      passwordGenerated: false,
      passwordFrom: 'env',
    });
    expect(devPlan(['--remote=cli'], env).password).toBe('cli');
  });
  it('no password is made without --remote', () => {
    expect(devPlan([], { SLIDE_NG_PASSWORD: 'x' })).toMatchObject({ remote: false, password: '' });
  });
  it('--remote does not swallow the next argument', () => {
    expect(devPlan(['--remote', 'other.md'], {}).entry.endsWith('other.md')).toBe(true);
  });
  it('--bind sets the address in remote mode only, as in Slidev', () => {
    expect(devPlan(['--bind', '127.0.0.1']).host).toBeUndefined();
    expect(devPlan(['--remote=x', '--bind', '192.168.1.5']).host).toBe('192.168.1.5');
  });
  it('refuses --tunnel, --base and a wrong --log', () => {
    expect(() => devPlan(['--tunnel'])).toThrow('--tunnel is not available');
    expect(() => devPlan(['--base', '/x/'])).toThrow('slide-ng build');
    expect(() => devPlan(['--log', 'loud'])).toThrow('--log must be one of');
  });
});

describe('ngServeArgs', () => {
  it('passes --open on the first start only, not on a restart', () => {
    const plan = { port: 4230, host: '0.0.0.0', open: true };
    expect(ngServeArgs(plan)).toEqual(['serve', '--port', '4230', '--host', '0.0.0.0', '--open']);
    expect(ngServeArgs(plan, true)).toEqual(['serve', '--port', '4230', '--host', '0.0.0.0']);
    expect(ngServeArgs({ port: 4230, host: null, open: false })).toEqual([
      'serve',
      '--port',
      '4230',
    ]);
  });
});

describe('ngServeEnv', () => {
  it('leaves PORT out, so --port (or its default) is the port Angular listens on', () => {
    expect(ngServeEnv({ PORT: '4411', SLIDES_FILE: 'a.md' })).toEqual({ SLIDES_FILE: 'a.md' });
  });
});

describe('deckRouterMode', () => {
  it("reads the entry's headmatter, history when it is missing or broken", () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-mode-'));
    const deck = (name: string, text: string) => (
      writeFileSync(join(dir, name), text),
      join(dir, name)
    );
    expect(deckRouterMode(deck('hash.md', '---\ntitle: x\nrouterMode: hash\n---\n\n# One\n'))).toBe(
      'hash',
    );
    expect(deckRouterMode(deck('crlf.md', '---\r\nrouterMode: hash\r\n---\r\n# One'))).toBe('hash');
    expect(deckRouterMode(deck('plain.md', '# One\n\n---\nrouterMode: hash\n---\n'))).toBe(
      'history',
    );
    expect(deckRouterMode(deck('bad.md', '---\nrouterMode: [\n---\n'))).toBe('history');
    expect(deckRouterMode(join(dir, 'missing.md'))).toBe('history');
  });
  it('takes routerMode from the theme, set in the headmatter or with --theme, under the deck', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-mode-theme-'));
    mkdirSync(join(dir, 'hash-theme'));
    writeFileSync(
      join(dir, 'hash-theme', 'theme.json'),
      JSON.stringify({ headmatter: { routerMode: 'hash' } }),
    );
    const deck = (name: string, text: string) => (
      writeFileSync(join(dir, name), text),
      join(dir, name)
    );
    expect(
      deckRouterMode(deck('themed.md', '---\ntheme: ./hash-theme\n---\n# One\n'), undefined),
    ).toBe('hash');
    expect(deckRouterMode(deck('plain.md', '# One\n'), join(dir, 'hash-theme'))).toBe('hash');
    expect(
      deckRouterMode(
        deck('own.md', '---\ntheme: ./hash-theme\nrouterMode: history\n---\n'),
        undefined,
      ),
    ).toBe('history');
    expect(deckRouterMode(deck('lost.md', '---\ntheme: ./nowhere\n---\n'), undefined)).toBe(
      'history',
    );
  });
  it('takes routerMode from the config file, under the headmatter', () => {
    const dir = mkdtempSync(join(tmpdir(), 'router-mode-config-'));
    writeFileSync(join(dir, 'slide-ng.config.yaml'), 'routerMode: hash\n');
    writeFileSync(join(dir, 'a.md'), '# One\n');
    writeFileSync(join(dir, 'b.md'), '---\nrouterMode: history\n---\n');
    expect(deckRouterMode(join(dir, 'a.md'), undefined)).toBe('hash');
    expect(deckRouterMode(join(dir, 'b.md'), undefined)).toBe('history');
  });
});
