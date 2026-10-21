import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deckRouterMode, devPlan, ngServeArgs } from './dev.mjs';

describe('devPlan', () => {
  it('has sensible defaults', () => {
    const plan = devPlan([], {});
    expect(plan).toMatchObject({
      port: 4230,
      open: false,
      remote: false,
      password: '',
      log: 'info',
      force: false,
    });
    expect(plan.entry.endsWith('slides.md')).toBe(true);
    expect(plan.host).toBeUndefined();
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
});
