import { describe, expect, it } from 'vitest';
import {
  cookieForProxy,
  realOrigin,
  rewriteCss,
  rewriteHtml,
  targetAllowed,
  LOCAL,
  guardedLookup,
  allowLocal,
  toProxy,
  toReal,
} from './web-proxy.mjs';

const key = 'abc123';
const port = 5000;

describe('proxy addresses', () => {
  it('give every site its own origin and map back', () => {
    const proxied = toProxy('https://github.com/slide-ng?tab=1#top', key, port);
    expect(proxied).toBe('http://github.com.https.abc123.localhost:5000/slide-ng?tab=1#top');
    expect(toReal(proxied, key)).toBe('https://github.com/slide-ng?tab=1#top');
    expect(toProxy('http://localhost:4200/a', key, port)).toBe(
      'http://localhost.http-4200.abc123.localhost:5000/a',
    );
    expect(realOrigin('localhost.http-4200.abc123.localhost:5000', key)).toBe(
      'http://localhost:4200',
    );
  });
  it('know no origin for another key or a plain host', () => {
    expect(realOrigin('github.com.https.other.localhost:5000', key)).toBeNull();
    expect(realOrigin('localhost:5000', key)).toBeNull();
    expect(realOrigin('evil.com/x.https.abc123.localhost', key)).toBeNull();
  });
  it('leave other schemes alone', () => {
    expect(toProxy('mailto:a@b.c', key, port)).toBe('mailto:a@b.c');
  });
});

describe('rewriteHtml', () => {
  const base = 'https://site.dev/docs/';
  it('adds the script first, maps absolute addresses and keeps relative ones', () => {
    const out = rewriteHtml(
      '<html><head><title>x</title></head><a href="https://other.dev/p">o</a><a href="/local">l</a><img src="//cdn.dev/i.png">',
      { key, port, base },
    );
    expect(out).toContain('<head><script src="/__slide-ng-web/shim.js"></script><title>');
    expect(out).toContain('href="http://other.dev.https.abc123.localhost:5000/p"');
    expect(out).toContain('href="/local"');
    expect(out).toContain('src="http://cdn.dev.https.abc123.localhost:5000/i.png"');
  });
  it('drops the page CSP, integrity and nonces, and keeps links in the frame', () => {
    const out = rewriteHtml(
      `<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'"><script integrity="sha384-x" nonce="n" src="/a.js"></script><a target="_top" href="/x">x</a>`,
      { key, port, base },
    );
    expect(out).not.toMatch(/content-security-policy|integrity|nonce/i);
    expect(out).toContain('target="_self"');
  });
  it('leaves script text alone and maps url()s in style blocks', () => {
    const out = rewriteHtml(
      `<script>el.innerHTML = '<a href="https://x.dev/" target="_top">'</script><style>a{background:url(https://x.dev/i.png)}</style>`,
      { key, port, base },
    );
    expect(out).toContain(`'<a href="https://x.dev/" target="_top">'`);
    expect(out).toContain('url(http://x.dev.https.abc123.localhost:5000/i.png)');
  });
  it('maps every address of a srcset', () => {
    const out = rewriteHtml('<img srcset="https://a.dev/1.png 1x, https://a.dev/2.png 2x">', {
      key,
      port,
      base,
    });
    expect(out).toContain('http://a.dev.https.abc123.localhost:5000/1.png 1x');
    expect(out).toContain('http://a.dev.https.abc123.localhost:5000/2.png 2x');
  });
});

describe('rewriteCss', () => {
  it('maps absolute url()s', () => {
    expect(
      rewriteCss('a{background:url("https://f.dev/x.woff2")} b{c:url(/rel.png)}', {
        key,
        port,
        base: 'https://s.dev/',
      }),
    ).toBe(
      'a{background:url("http://f.dev.https.abc123.localhost:5000/x.woff2")} b{c:url(/rel.png)}',
    );
  });
});

describe('cookieForProxy', () => {
  it('drops the Domain, so the cookie stays on the proxied site', () => {
    expect(cookieForProxy('sid=1; Domain=.github.com; Path=/; Secure; HttpOnly')).toBe(
      'sid=1; Path=/; HttpOnly; SameSite=None; Secure',
    );
  });

  it('lets the frame keep the cookie: SameSite=None; Secure, whatever the site sent', () => {
    expect(cookieForProxy('sid=1; Path=/; SameSite=Lax')).toBe(
      'sid=1; Path=/; SameSite=None; Secure',
    );
    expect(cookieForProxy('sid=1; samesite=strict; HttpOnly')).toBe(
      'sid=1; HttpOnly; SameSite=None; Secure',
    );
    expect(cookieForProxy('sid=1')).toBe('sid=1; SameSite=None; Secure');
  });
});

describe('targetAllowed', () => {
  const resolve = (async (host: string) => [
    {
      address:
        host === 'rebind.dev'
          ? '127.0.0.1'
          : host === 'router.lan'
            ? '192.168.1.1'
            : '93.184.216.34',
      family: 4,
    },
  ]) as unknown as Parameters<typeof targetAllowed>[3];
  const opened = new Set(['http://localhost:4200', 'http://localhost:4230']);
  it("refuses the deck's own ports on this machine, also through a name that points here", async () => {
    expect(
      await targetAllowed('http://localhost:4230/__slide-ng/session', [4230], opened, resolve),
    ).toBe(false);
    expect(await targetAllowed('http://rebind.dev:4230/', [4230], opened, resolve)).toBe(false);
  });
  it('lets other sites through', async () => {
    expect(await targetAllowed('https://example.com/', [4230], new Set(), resolve)).toBe(true);
    expect(await targetAllowed('http://example.com:4230/', [4230], new Set(), resolve)).toBe(true);
  });
  it('lets a local or private address through only once the deck opened it', async () => {
    expect(await targetAllowed('http://localhost:4200/', [4230], opened, resolve)).toBe(true);
    expect(await targetAllowed('http://localhost:5432/', [4230], opened, resolve)).toBe(false);
    expect(await targetAllowed('http://router.lan/', [4230], opened, resolve)).toBe(false);
    expect(await targetAllowed('http://rebind.dev:8080/', [4230], opened, resolve)).toBe(false);
  });
});

describe('LOCAL', () => {
  it('knows loopback, private, shared and mapped addresses', () => {
    for (const a of [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.100.100.100',
      '0.1.2.3',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:172.16.0.1',
      '::ffff:7f00:1',
    ])
      expect(LOCAL(a)).toBe(true);
    for (const a of [
      '93.184.216.34',
      '172.32.0.1',
      '100.128.0.1',
      '2606:4700::1111',
      '::ffff:93.184.216.34',
    ])
      expect(LOCAL(a)).toBe(false);
  });
});

describe('guardedLookup', () => {
  type Resolve = Parameters<typeof guardedLookup>[3];
  const answer = (address: string) =>
    ((
      _host: string,
      _o: unknown,
      done: (e: null, list: { address: string; family: number }[]) => void,
    ) => done(null, [{ address, family: 4 }])) as unknown as Resolve;
  const run = (target: string, address: string, opened: string[] = []) =>
    new Promise<string>((resolve) =>
      guardedLookup(
        target,
        () => [4230],
        new Set(opened),
        answer(address),
      )('h', {}, (e: { code?: string } | null, a?: string) =>
        resolve(e ? (e.code ?? 'error') : String(a)),
      ),
    );
  it('refuses a name that turns local at connect time, unless the deck opened that origin', async () => {
    expect(await run('http://rebind.dev/', '127.0.0.1')).toBe('ELOCAL');
    expect(await run('http://rebind.dev/', '93.184.216.34')).toBe('93.184.216.34');
    expect(await run('http://localhost:4200/', '127.0.0.1', ['http://localhost:4200'])).toBe(
      '127.0.0.1',
    );
    expect(await run('http://localhost:4230/', '127.0.0.1', ['http://localhost:4230'])).toBe(
      'ELOCAL',
    );
  });
});

describe('allowLocal', () => {
  const resolve = (async (host: string) => [
    { address: host === 'router.lan' ? '192.168.1.1' : '93.184.216.34', family: 4 },
  ]) as unknown as Parameters<typeof allowLocal>[2];
  it('keeps only local origins, so a public name cannot later point here', async () => {
    const allowed = new Set<string>();
    await allowLocal('http://localhost:4200/a', allowed, resolve);
    await allowLocal('http://router.lan/', allowed, resolve);
    await allowLocal('https://evil.dev/', allowed, resolve);
    expect([...allowed]).toEqual(['http://localhost:4200', 'http://router.lan']);
    await expect(allowLocal('file:///etc/passwd', allowed, resolve)).rejects.toThrow();
  });
});

describe('a bad port', () => {
  it('is not a proxy address, and is refused instead of throwing', async () => {
    expect(realOrigin('x.http-99999.abc123.localhost:5000', 'abc123')).toBeNull();
    expect(realOrigin('x.http-0.abc123.localhost:5000', 'abc123')).toBeNull();
    expect(await targetAllowed('http://x:99999/', [], new Set())).toBe(false);
  });
});
