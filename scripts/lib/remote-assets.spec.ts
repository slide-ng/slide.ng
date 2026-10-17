import { mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundleRemoteAssets,
  downloadImage,
  findRemoteImages,
  localName,
  rewriteAddresses,
  sniffImage,
} from './remote-assets.mjs';

describe('findRemoteImages', () => {
  it('finds markdown images, img tags, css urls and frontmatter keys', () => {
    const text = [
      '![a](https://x.test/a.png)',
      '![b](<https://x.test/b.png> "title")',
      '<img class="w-4" src="https://x.test/c.jpg" />',
      "style: background: url('https://x.test/d.gif')",
      'image: https://x.test/e.webp',
      'backgroundImage: "https://x.test/f.png"',
    ].join('\n');
    expect(findRemoteImages(text).sort()).toEqual([
      'https://x.test/a.png',
      'https://x.test/b.png',
      'https://x.test/c.jpg',
      'https://x.test/d.gif',
      'https://x.test/e.webp',
      'https://x.test/f.png',
    ]);
  });
  it('ignores plain links, local images and addresses inside code that are not image syntax', () => {
    expect(
      findRemoteImages('[link](https://x.test/page) ![l](/local.png) see https://x.test/a.png'),
    ).toEqual([]);
  });
});

describe('localName', () => {
  it('is a stable hash with an extension from the content type', () => {
    expect(localName('https://x.test/a.png', 'image/png')).toMatch(/^[0-9a-f]{16}\.png$/);
    expect(localName('https://x.test/a.png', 'image/png')).toBe(
      localName('https://x.test/a.png', 'image/png; charset=x'),
    );
    expect(localName('https://x.test/a', 'image/unknown')).toMatch(/\.img$/);
  });
});

describe('rewriteAddresses', () => {
  it('replaces every use, longest address first', () => {
    const map = {
      'https://x.test/a': 'remote-assets/1.png',
      'https://x.test/a.png': 'remote-assets/2.png',
    };
    expect(rewriteAddresses('![](https://x.test/a.png) ![](https://x.test/a)', map)).toBe(
      '![](remote-assets/2.png) ![](remote-assets/1.png)',
    );
  });
});

describe('rewriteAddresses, whole addresses', () => {
  it('leaves an address that only starts like a downloaded one', () => {
    const map = { 'https://x.test/a.png': 'remote-assets/1.png' };
    const text = '![](https://x.test/a.png?v=2) ![](https://x.test/a.png) "https://x.test/a.png"';
    expect(rewriteAddresses(text, map)).toBe(
      '![](https://x.test/a.png?v=2) ![](remote-assets/1.png) "remote-assets/1.png"',
    );
  });
});

describe('bundleRemoteAssets', () => {
  const png = Buffer.from('89504e470d0a1a0a', 'hex');
  const fakeFetch = async (url: string) => {
    if (url.endsWith('/ok.png'))
      return new Response(png, { headers: { 'content-type': 'image/png' } });
    if (url.endsWith('/page.html'))
      return new Response('<p>hi</p>', { headers: { 'content-type': 'text/html' } });
    return new Response('nope', { status: 404 });
  };
  it('downloads images, writes them by hash and rewrites the slides', async () => {
    const folder = join(mkdtempSync(join(tmpdir(), 'slide-ng-remote-')), 'remote-assets');
    const slides = [
      {
        content: '![x](https://x.test/ok.png)',
        frontmatter: { image: 'https://x.test/ok.png' },
        note: 'see https://x.test/ok.png',
      },
    ];
    const warnings: string[] = [];
    const count = await bundleRemoteAssets(
      slides,
      folder,
      (m: string) => {
        warnings.push(m);
      },
      fakeFetch as never,
    );
    const [file] = readdirSync(folder);
    expect(count).toBe(1);
    expect(readFileSync(join(folder, file))).toEqual(png);
    expect(slides[0].content).toBe(`![x](remote-assets/${file})`);
    expect(slides[0].frontmatter.image).toBe(`remote-assets/${file}`);
    expect(warnings).toEqual([]);
  });
  it('downloads a picture named only in the frontmatter', async () => {
    const folder = join(mkdtempSync(join(tmpdir(), 'slide-ng-remote-')), 'remote-assets');
    const slides = [
      { content: '# Hi', frontmatter: { background: 'https://x.test/ok.png' }, note: null },
    ];
    expect(await bundleRemoteAssets(slides, folder, () => {}, fakeFetch as never)).toBe(1);
    expect(slides[0].frontmatter.background).toMatch(/^remote-assets\//);
  });
  it('leaves non-images and failures alone, with a warning', async () => {
    const folder = join(mkdtempSync(join(tmpdir(), 'slide-ng-remote-')), 'remote-assets');
    const slides = [
      {
        content: '![a](https://x.test/page.html) ![b](https://x.test/missing.png)',
        frontmatter: {},
        note: null,
      },
    ];
    const warnings: string[] = [];
    const count = await bundleRemoteAssets(
      slides,
      folder,
      (m: string) => {
        warnings.push(m);
      },
      fakeFetch as never,
    );
    expect(count).toBe(0);
    expect(slides[0].content).toContain('https://x.test/page.html');
    expect(warnings.length).toBe(2);
    expect(readdirSync(folder)).toEqual([]);
  });
});

describe('downloadImage: what is not taken', () => {
  const png = Buffer.from('89504e470d0a1a0a00', 'hex');
  const answer = (body: Buffer | string, type = 'image/png', headers = {}) =>
    (async () =>
      new Response(typeof body === 'string' ? body : new Uint8Array(body), {
        headers: { 'content-type': type, ...headers },
      })) as never;
  const ask = async (fetchImpl: never, url = 'https://x.test/a.png') => {
    const warnings: string[] = [];
    const got = await downloadImage(url, (m: string) => (warnings.push(m), null), fetchImpl);
    return { got, warnings };
  };

  it('refuses addresses that are not public, without sending a request', async () => {
    for (const url of [
      'http://127.0.0.1:9/a.png',
      'http://169.254.169.254/latest/meta-data/x.png',
      'http://192.168.1.1/a.png',
      'http://localhost:9/a.png',
    ]) {
      const warnings: string[] = [];
      const got = await downloadImage(url, (m: string) => (warnings.push(m), null), undefined, {
        allowLocal: false,
      });
      expect(got, url).toBeNull();
      expect(warnings[0], url).toContain('not a public address');
    }
  });
  it('drops SVG, because a served .svg can run script', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>';
    const { got, warnings } = await ask(answer(svg, 'image/svg+xml'));
    expect(got).toBeNull();
    expect(warnings[0]).toContain('SVG');
    expect((await ask(answer(`<?xml version="1.0"?>\n${svg}`, 'image/png'))).got).toBeNull();
  });
  it('checks the first bytes, not the content type the server claims', async () => {
    const { got, warnings } = await ask(answer('<html><script>1</script></html>'));
    expect(got).toBeNull();
    expect(warnings[0]).toContain('does not start like a picture');
  });
  it('names the file after the sniffed format', async () => {
    const jpeg = Buffer.from('ffd8ffe000104a46494600', 'hex');
    const { got } = await ask(answer(jpeg, 'image/png'));
    expect(got?.name).toMatch(/\.jpg$/);
  });
  it('refuses a picture that says it is over 20 MB before reading it', async () => {
    const { got, warnings } = await ask(
      answer(png, 'image/png', { 'content-length': String(30 * 1024 * 1024) }),
    );
    expect(got).toBeNull();
    expect(warnings[0]).toContain('Content-Length');
  });
});

describe('sniffImage', () => {
  it('knows the formats it takes', () => {
    const b = (hex: string) => Buffer.from(hex, 'hex');
    expect(sniffImage(b('89504e470d0a1a0a'))).toBe('image/png');
    expect(sniffImage(b('ffd8ff'))).toBe('image/jpeg');
    expect(sniffImage(Buffer.from('GIF89a..'))).toBe('image/gif');
    expect(sniffImage(Buffer.from('RIFF....WEBPVP8 '))).toBe('image/webp');
    expect(sniffImage(Buffer.from('\0\0\0\x18ftypavif'))).toBe('image/avif');
    expect(sniffImage(b('00000100'))).toBe('image/x-icon');
    expect(sniffImage(Buffer.from('plain text'))).toBeNull();
  });
});
