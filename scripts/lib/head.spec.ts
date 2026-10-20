import { describe, expect, it } from 'vitest';
import { applyTitleTemplate, faviconHref, headParts, pageTitle, renderIndexHtml } from './head.mjs';

const template =
  '<!doctype html>\n<html lang="en">\n<head>\n  <title>slide.ng</title>\n  <link rel="icon" type="image/x-icon" href="favicon.ico">\n</head>\n<body></body>\n</html>';

describe('titles', () => {
  it('puts the title into the template', () => {
    expect(applyTitleTemplate('%s - Talk', 'Intro')).toBe('Intro - Talk');
    expect(applyTitleTemplate(undefined, 'Intro')).toBe('Intro');
    expect(pageTitle({ title: 'My deck', titleTemplate: '%s | me' })).toBe('My deck | me');
    expect(pageTitle({})).toBe('slide.ng');
  });
});

describe('faviconHref', () => {
  it('takes web addresses and public files, and refuses script addresses', () => {
    expect(faviconHref('https://x.test/i.png')).toBe('https://x.test/i.png');
    expect(faviconHref('/logo.svg')).toBe('logo.svg');
    expect(faviconHref('icons/a.png')).toBe('icons/a.png');
    expect(faviconHref('javascript:alert(1)')).toBeNull();
    expect(faviconHref('//evil.test/x.png')).toBeNull();
  });
});

describe('headParts', () => {
  it('makes description, author, keywords and the Open Graph basics', () => {
    const p = headParts({
      title: 'T',
      info: '## Hello *world*\n\nmore',
      author: 'Me',
      keywords: ['a', 'b'],
    });
    expect(p.tags).toContain('<meta name="description" content="Hello world more">');
    expect(p.tags).toContain('<meta name="author" content="Me">');
    expect(p.tags).toContain('<meta name="keywords" content="a, b">');
    expect(p.tags).toContain('<meta property="og:title" content="T">');
    expect(p.tags).toContain('<meta property="og:description" content="Hello world more">');
  });
  it('maps seoMeta keys to og: and twitter: tags, and lets them win over the defaults', () => {
    const p = headParts({
      title: 'T',
      seoMeta: {
        ogTitle: 'Other',
        ogUrl: 'https://x.test',
        twitterCard: 'summary_large_image',
        twitterSite: '@me',
        ogImageWidth: 1200,
      },
    });
    expect(p.tags).toContain('<meta property="og:title" content="Other">');
    expect(p.tags).toContain('<meta property="og:url" content="https://x.test">');
    expect(p.tags).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(p.tags).toContain('<meta name="twitter:site" content="@me">');
    expect(p.tags).toContain('<meta property="og:image:width" content="1200">');
  });
  it('uses the chosen og image address, and nothing for `auto` without one', () => {
    expect(
      headParts({ seoMeta: { ogImage: 'auto' } }).tags.some((t: string) => t.includes('og:image')),
    ).toBe(false);
    expect(
      headParts({ seoMeta: { ogImage: 'auto' } }, { ogImage: 'https://x.test/og-image.png' }).tags,
    ).toContain('<meta property="og:image" content="https://x.test/og-image.png">');
    expect(headParts({ seoMeta: { ogImage: 'https://x.test/a.png' } }).tags).toContain(
      '<meta property="og:image" content="https://x.test/a.png">',
    );
  });
  it('warns about unknown seoMeta keys', () => {
    const warnings: string[] = [];
    headParts({ seoMeta: { nonsense: 'x' } }, { warn: (m: string) => warnings.push(m) });
    expect(warnings[0]).toContain('nonsense');
  });
  it('escapes everything it writes', () => {
    const p = headParts({ title: '"><script>alert(1)</script>', author: 'a"b<c', info: 'x"y' });
    expect(p.tags.join('')).not.toContain('<script>');
    expect(p.tags).toContain('<meta name="author" content="a&quot;b&lt;c">');
  });
  it('records the router mode, so `export --dist` opens the build with the right addresses', () => {
    expect(headParts({ routerMode: 'memory' }).tags).toContain(
      '<meta name="slide-ng-router-mode" content="memory">',
    );
    expect(headParts({}).tags).toContain('<meta name="slide-ng-router-mode" content="history">');
  });
  it('adds the manifest link for pwa', () => {
    expect(headParts({}, { pwa: true }).tags).toContain(
      '<link rel="manifest" href="manifest.webmanifest">',
    );
  });
});

describe('renderIndexHtml', () => {
  it('sets lang, htmlAttrs, title, favicon and tags', () => {
    const html = renderIndexHtml(
      template,
      headParts({
        title: 'A & B',
        lang: 'fr',
        htmlAttrs: { 'data-x': '1', class: 'dark' },
        favicon: '/fav.png',
        author: 'me',
      }),
    );
    expect(html).toContain('<html lang="fr" data-x="1" class="dark">');
    expect(html).toContain('<title>A &amp; B</title>');
    expect(html).toContain('<link rel="icon" href="fav.png" type="image/png">');
    expect(html).not.toContain('favicon.ico');
    expect(html).toContain('<meta name="author" content="me">');
  });
  it('keeps the template icon without a favicon, and drops bad attribute names', () => {
    const warnings: string[] = [];
    const html = renderIndexHtml(
      template,
      headParts({ htmlAttrs: { onload: 'x()', 'bad name': 1, ok: 'y' } }),
      (m: string) => warnings.push(m),
    );
    expect(html).toContain('favicon.ico');
    expect(html).toContain('<html lang="en" ok="y">');
    expect(warnings.length).toBe(2);
  });
});
