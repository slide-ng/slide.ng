import { describe, expect, it } from 'vitest';
import { createCookieJar, sameSiteContext, siteOf } from './cookie-jar.mjs';

const SITE = 'https://shop.example.com/cart';

describe('siteOf', () => {
  it('is the registrable domain, so subdomains share a site and other sites do not', () => {
    expect(siteOf('https://a.example.com/')).toBe(siteOf('https://b.example.com/x'));
    expect(siteOf('https://example.com/')).not.toBe(siteOf('https://example.org/'));
    expect(siteOf('https://a.github.io/')).not.toBe(siteOf('https://b.github.io/'));
    expect(siteOf('https://a.co.uk/')).not.toBe(siteOf('https://b.co.uk/'));
  });

  it('is the host itself for addresses and names without a suffix', () => {
    expect(siteOf('http://127.0.0.1:3000/')).toBe('127.0.0.1');
    expect(siteOf('http://localhost:3000/')).toBe('localhost');
    expect(siteOf('http://127.0.0.1:1/')).toBe(siteOf('http://127.0.0.1:2/'));
  });
});

describe('sameSiteContext', () => {
  const base = { target: SITE, navigate: false, method: 'GET' };

  it('is strict when the user asked, or the same site did', () => {
    expect(sameSiteContext({ ...base, from: null })).toBe('strict');
    expect(sameSiteContext({ ...base, from: 'https://www.example.com/' })).toBe('strict');
  });

  it('is lax for a link another site sent the user along, and only for a read', () => {
    const from = 'https://evil.test/';
    expect(sameSiteContext({ ...base, from, navigate: true })).toBe('lax');
    expect(sameSiteContext({ ...base, from, navigate: true, method: 'POST' })).toBe('none');
  });

  it('is none for anything else another site asked', () => {
    expect(sameSiteContext({ ...base, from: 'https://evil.test/' })).toBe('none');
  });

  it('counts an address that is not one, or a missing page, as another site', () => {
    expect(sameSiteContext({ ...base, from: 'null:' })).toBe('none');
    expect(sameSiteContext({ ...base, from: 'not a url' })).toBe('none');
  });
});

describe('the cookie jar', () => {
  it('keeps a cookie from a sign-in and sends it back to the same site', async () => {
    const jar = createCookieJar();
    await jar.store(['sid=1; Path=/; HttpOnly'], SITE, 'strict');
    expect(await jar.header(SITE, 'strict')).toBe('sid=1');
    expect(await jar.header('https://other.test/', 'strict')).toBe('');
  });

  it('treats a cookie without SameSite as Lax, like a browser', async () => {
    const jar = createCookieJar();
    await jar.store(['plain=1; Path=/'], SITE, 'strict');
    expect(await jar.header(SITE, 'strict')).toBe('plain=1');
    expect(await jar.header(SITE, 'lax')).toBe('plain=1');
    expect(await jar.header(SITE, 'none')).toBe('');
  });

  it('sends Strict cookies only to the same site, Lax ones also to a link, None ones always', async () => {
    const jar = createCookieJar();
    await jar.store(
      [
        's=1; Path=/; SameSite=Strict',
        'l=1; Path=/; SameSite=Lax',
        'n=1; Path=/; SameSite=None; Secure',
      ],
      SITE,
      'strict',
    );
    expect(await jar.header(SITE, 'strict')).toBe('s=1; l=1; n=1');
    expect(await jar.header(SITE, 'lax')).toBe('l=1; n=1');
    expect(await jar.header(SITE, 'none')).toBe('n=1');
  });

  it('refuses a SameSite cookie that another site tries to set', async () => {
    const jar = createCookieJar();
    await jar.store(['s=1; SameSite=Strict', 'l=1; SameSite=Lax', 'p=1'], SITE, 'none');
    expect(await jar.header(SITE, 'strict')).toBe('');
    await jar.store(['n=1; SameSite=None; Secure'], SITE, 'none');
    expect(await jar.header(SITE, 'strict')).toBe('n=1');
  });

  it('takes a Secure cookie from a local address over http, but not from another http site', async () => {
    const jar = createCookieJar();
    await jar.store(['a=1; Secure; SameSite=None'], 'http://127.0.0.1:47131/', 'strict');
    expect(await jar.header('http://127.0.0.1:47131/', 'strict')).toBe('a=1');
    await jar.store(['b=1; Secure; SameSite=None'], 'http://insecure.example.com/', 'strict');
    expect(await jar.header('http://insecure.example.com/', 'strict')).toBe('');
  });

  it('keeps HttpOnly cookies from scripts, and takes none from them', async () => {
    const jar = createCookieJar();
    await jar.store(['sid=1; HttpOnly', 'theme=dark'], SITE, 'strict');
    expect(await jar.visible(SITE)).toBe('theme=dark');
    await jar.fromScript('mine=1', SITE);
    await jar.fromScript('forced=1; HttpOnly', SITE);
    expect(await jar.visible(SITE)).toBe('theme=dark; mine=1');
    expect(await jar.header(SITE, 'strict')).toBe('sid=1; theme=dark; mine=1');
  });

  it('refuses a Domain of another site and of a public suffix', async () => {
    const jar = createCookieJar();
    await jar.store(
      ['a=1; Domain=evil.test', 'b=1; Domain=com', 'c=1; Domain=example.com'],
      SITE,
      'strict',
    );
    expect(await jar.header('https://evil.test/', 'strict')).toBe('');
    expect(await jar.header('https://other.com/', 'strict')).toBe('');
    expect(await jar.header('https://www.example.com/', 'strict')).toBe('c=1');
  });

  it('forgets a cookie the site expires', async () => {
    const jar = createCookieJar();
    await jar.store(['sid=1; Path=/'], SITE, 'strict');
    await jar.store(['sid=; Path=/; Max-Age=0'], SITE, 'strict');
    expect(await jar.header(SITE, 'strict')).toBe('');
  });

  it('ignores a cookie that is too large, and clears on request', async () => {
    const jar = createCookieJar();
    await jar.store([`big=${'x'.repeat(5000)}`, 'ok=1'], SITE, 'strict');
    expect(await jar.header(SITE, 'strict')).toBe('ok=1');
    await jar.clear();
    expect(await jar.header(SITE, 'strict')).toBe('');
  });
});
