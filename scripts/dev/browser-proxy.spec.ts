import { describe, expect, it } from 'vitest';
import { proxy } from '../../docs/browser-proxy/browser-proxy.js';

const page = `<html><head><title>t</title><meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'"></head>
<a href="/next" target="_blank">n</a><a href="#top">t</a><form action="/search"><input name="q"></form>
<form method="post" action="/html/"></form><script>x = '<a href="/raw">'</script></html>`;

const site = (async (url: string) =>
  url.endsWith('/moved')
    ? new Response(null, { status: 302, headers: { location: '/there' } })
    : new Response(page, {
        headers: {
          'content-type': 'text/html',
          'x-frame-options': 'DENY',
          'set-cookie': 'sid=1',
        },
      })) as unknown as typeof fetch;

const ask = (url: string, referer = 'https://me.github.io/talk/') =>
  proxy(new Request(url, { headers: { referer } }), {
    decks: ['https://me.github.io'],
    fetch: site,
  });

describe('the deck browser proxy', () => {
  it('drops the framing headers and cookies, and keeps links and forms going through it', async () => {
    const res = await ask('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fx');
    const html = await res.text();
    expect(res.headers.get('x-frame-options')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(html).toContain('<head><base href="https://a.dev/x">');
    expect(html).not.toMatch(/content-security-policy/i);
    expect(html).toContain(
      'href="https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fnext" target="_self"',
    );
    expect(html).toContain('href="#top"');
    expect(html).toContain(
      '<form action="https://p.dev/proxy"><input type="hidden" name="__slide_ng_url" value="https://a.dev/search">',
    );
    expect(html).toContain('action="https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fhtml%2F"');
    expect(html).toContain(`x = '<a href="/raw">'`);
  });
  it('sends a form sent with GET to its own page, with its fields', async () => {
    let asked = '';
    const spy = (async (url: string) => {
      asked = url;
      return new Response('ok', { headers: { 'content-type': 'text/plain' } });
    }) as unknown as typeof fetch;
    await proxy(
      new Request('https://p.dev/proxy?q=hi+there&__slide_ng_url=https%3A%2F%2Fa.dev%2Fsearch', {
        headers: { referer: 'https://p.dev/proxy' },
      }),
      { decks: ['https://me.github.io'], fetch: spy },
    );
    expect(asked).toBe('https://a.dev/search?q=hi+there');
  });
  it('keeps a redirect inside', async () => {
    const res = await ask('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fmoved');
    expect(res.headers.get('location')).toBe('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fthere');
  });
  it('answers only its decks and itself, and only web addresses', async () => {
    expect(
      (await ask('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2F', 'https://evil.dev/')).status,
    ).toBe(403);
    expect(
      (await ask('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2F', 'https://p.dev/proxy')).status,
    ).toBe(200);
    expect((await ask('https://p.dev/proxy?url=file%3A%2F%2F%2Fetc%2Fpasswd')).status).toBe(400);
  });
});
