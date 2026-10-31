import { describe, expect, it } from 'vitest';
import {
  cookieForProxy,
  realOrigin,
  rewriteCss,
  rewriteHtml,
  targetAllowed,
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
      'sid=1; Path=/; Secure; HttpOnly',
    );
  });
});

describe('targetAllowed', () => {
  const resolve = (async (host: string) => [
    { address: host === 'rebind.dev' ? '127.0.0.1' : '93.184.216.34', family: 4 },
  ]) as unknown as Parameters<typeof targetAllowed>[2];
  it("refuses the deck's own ports on this machine, also through a name that points here", async () => {
    expect(await targetAllowed('http://localhost:4230/__slide-ng/session', [4230], resolve)).toBe(
      false,
    );
    expect(await targetAllowed('http://rebind.dev:4230/', [4230], resolve)).toBe(false);
  });
  it('lets other sites and other local apps through', async () => {
    expect(await targetAllowed('http://localhost:4200/', [4230], resolve)).toBe(true);
    expect(await targetAllowed('https://example.com/', [4230], resolve)).toBe(true);
    expect(await targetAllowed('http://example.com:4230/', [4230], resolve)).toBe(true);
  });
});
