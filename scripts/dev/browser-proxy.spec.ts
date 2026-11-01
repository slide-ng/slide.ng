import { describe, expect, it } from 'vitest';
import { isPrivateHost, proxy } from '../../docs/browser-proxy/browser-proxy.js';

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
    expect(res.headers.get('content-security-policy')).toMatch(/^sandbox allow-scripts/);
    expect(res.headers.get('content-security-policy')).not.toContain('allow-same-origin');
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
  it('refuses addresses on the machine or network it runs on', async () => {
    for (const host of [
      'localhost',
      'router',
      '127.0.0.1',
      '10.0.0.2',
      '192.168.1.1',
      '169.254.169.254',
      '100.100.100.100',
      '[::1]',
      '[fd00::1]',
      'printer.local',
      'metadata.google.internal',
    ])
      expect(isPrivateHost(host), host).toBe(true);
    for (const host of ['duckduckgo.com', '93.184.216.34', '[2606:4700::1111]'])
      expect(isPrivateHost(host), host).toBe(false);
    expect(
      (await ask('https://p.dev/proxy?url=http%3A%2F%2F169.254.169.254%2Flatest%2F')).status,
    ).toBe(400);
  });
  it('lets a frame without a Referer through, but not a script', async () => {
    const go = (dest?: string) =>
      proxy(
        new Request('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2F', {
          headers: dest ? { 'sec-fetch-dest': dest } : {},
        }),
        {
          decks: ['https://me.github.io'],
          fetch: site,
        },
      );
    expect((await go('iframe')).status).toBe(200);
    expect((await go()).status).toBe(403);
  });
  it('reads the page in its own charset and keeps a meta refresh inside', async () => {
    const latin = (async () =>
      new Response(new Uint8Array([0x3c, 0x70, 0x3e, 0xfc, 0x3c, 0x2f, 0x70, 0x3e]), {
        headers: { 'content-type': 'text/html; charset=windows-1254' },
      })) as unknown as typeof fetch;
    const r1 = await proxy(new Request('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2F'), {
      fetch: latin,
    });
    expect(await r1.text()).toContain('<p>ü</p>');
    const refresh = (async () =>
      new Response('<meta http-equiv="refresh" content="0; url=/next">', {
        headers: { 'content-type': 'text/html' },
      })) as unknown as typeof fetch;
    const r2 = await proxy(new Request('https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2F'), {
      fetch: refresh,
    });
    expect(await r2.text()).toContain('url=https://p.dev/proxy?url=https%3A%2F%2Fa.dev%2Fnext');
  });
});
