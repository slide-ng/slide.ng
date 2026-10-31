import { describe, expect, it, vi } from 'vitest';
import { checkFraming, framingAllowed } from './frame-check.mjs';

const page = 'http://localhost:4230';
const h = (init: Record<string, string>) => new Headers(init);

describe('framingAllowed', () => {
  it('allows a site with no framing headers', () => {
    expect(framingAllowed(h({}), page)).toBe(true);
  });
  it('refuses X-Frame-Options DENY and SAMEORIGIN', () => {
    expect(framingAllowed(h({ 'x-frame-options': 'DENY' }), page)).toBe(false);
    expect(framingAllowed(h({ 'x-frame-options': 'sameorigin' }), page)).toBe(false);
  });
  it('follows frame-ancestors over X-Frame-Options', () => {
    const csp = { 'x-frame-options': 'DENY', 'content-security-policy': 'frame-ancestors *' };
    expect(framingAllowed(h(csp), page)).toBe(true);
  });
  it("refuses 'none', 'self' and other origins, and takes a matching source", () => {
    const ancestors = (v: string) =>
      h({ 'content-security-policy': `default-src 'self'; frame-ancestors ${v}` });
    expect(framingAllowed(ancestors("'none'"), page)).toBe(false);
    expect(framingAllowed(ancestors("'self' https://a.dev"), page)).toBe(false);
    expect(framingAllowed(ancestors('http://localhost:4230'), page)).toBe(true);
    expect(framingAllowed(ancestors('localhost:*'), page)).toBe(true);
    expect(framingAllowed(ancestors('http:'), page)).toBe(true);
    expect(framingAllowed(ancestors('https://*.example.com'), 'https://deck.example.com')).toBe(
      true,
    );
  });
  it('needs every policy to allow it', () => {
    const two = h({ 'content-security-policy': "frame-ancestors *, frame-ancestors 'none'" });
    expect(framingAllowed(two, page)).toBe(false);
  });
});

describe('checkFraming', () => {
  it('reads the headers of the answer, and is null for other schemes or a failed request', async () => {
    const get = vi.fn(async () => new Response('', { headers: { 'x-frame-options': 'DENY' } }));
    expect(await checkFraming('https://refuses.example/', page, { fetch: get })).toBe(false);
    expect(await checkFraming('file:///etc/passwd', page, { fetch: get })).toBeNull();
    const down = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await checkFraming('https://down.example/', page, { fetch: down })).toBeNull();
  });
  it('asks once per address for a while', async () => {
    const get = vi.fn(async () => new Response(''));
    await checkFraming('https://cached.example/', page, { fetch: get });
    await checkFraming('https://cached.example/', page, { fetch: get });
    expect(get).toHaveBeenCalledTimes(1);
  });
});
