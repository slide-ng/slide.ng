import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { indexHtmlParts, injectIndexHtml, rootIndexHtml } from './index-html.mjs';

const page =
  '<html>\n<head>\n  <title>t</title>\n</head>\n<body>\n  <app-root><div>Loading</div></app-root>\n</body>\n</html>';

describe('indexHtmlParts', () => {
  it('takes the inside of <head> and <body>, with attributes on the tags', () => {
    const parts = indexHtmlParts(
      '<!doctype html><html><head lang="x">\n <meta name="a">\n</head><body class="b">\n<script>go()</script>\n</body></html>',
    );
    expect(parts).toEqual({
      head: '<meta name="a">',
      body: '<script>go()</script>',
      htmlAttrs: {},
      bodyAttrs: { class: 'b' },
    });
  });
  it('gives empty parts for missing elements', () => {
    expect(indexHtmlParts('<head><meta name="a"></head>')).toMatchObject({
      head: '<meta name="a">',
      body: '',
    });
    expect(indexHtmlParts('just text')).toEqual({
      head: '',
      body: '',
      htmlAttrs: {},
      bodyAttrs: {},
    });
  });
  it('reads the attributes of <html> as written', () => {
    expect(
      indexHtmlParts(`<html lang="de" class='a "b"' data-x=1 hidden><body></body></html>`)
        .htmlAttrs,
    ).toEqual({ lang: 'de', class: 'a "b"', 'data-x': '1', hidden: true });
  });
});

describe('injectIndexHtml', () => {
  it('puts the head before </head> and the body after the app', () => {
    const html = injectIndexHtml(page, { head: '<meta name="x">', body: '<script>y()</script>' });
    expect(html).toContain('<meta name="x">\n</head>');
    expect(html).toContain('</app-root>\n<script>y()</script>');
  });
  it("lets the head's <title> and <meta name> replace the page's, the later one winning", () => {
    const own =
      '<html>\n<head>\n  <title>From headmatter</title>\n  <meta name="description" content="hm">\n  <meta charset="utf-8">\n</head>\n<body></body>\n</html>';
    const html = injectIndexHtml(own, {
      head: '<title>Theme</title>\n<title>Deck</title>\n<meta name="description" content="deck">\n<meta property="og:site_name" content="s">',
      body: '',
    });
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<title>Deck</title>');
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="description" content="deck">');
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('og:site_name');
  });
  it('keeps tags meant to repeat: a theme-color per media and Open Graph arrays', () => {
    const own =
      '<html>\n<head>\n  <meta property="og:title" content="hm">\n  <meta property="og:image" content="og-image.png">\n  <meta name="theme-color" content="#fff">\n</head>\n<body></body>\n</html>';
    const html = injectIndexHtml(own, {
      head: [
        '<meta property="og:title" content="deck">',
        '<meta property="og:image" content="a.png">',
        '<meta property="og:image" content="b.png">',
        '<meta property="article:tag" content="x">',
        '<meta property="article:tag" content="y">',
        '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#fff">',
        '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000">',
      ].join('\n'),
      body: '',
    });
    expect(html.match(/og:title/g)).toHaveLength(1);
    expect(html).toContain('<meta property="og:title" content="deck">');
    expect(html.match(/property="og:image"/g)).toHaveLength(3);
    expect(html.match(/article:tag/g)).toHaveLength(2);
    // The two media are two tags; the page's one without media is another key.
    expect(html.match(/name="theme-color"/g)).toHaveLength(3);
  });
  it("leaves the page's own tags alone when index.html has none of that key", () => {
    const own =
      '<html><head><meta name="x" content="1"><meta name="x" content="2"></head><body></body></html>';
    const html = injectIndexHtml(own, { head: '<meta name="y" content="3">', body: '' });
    expect(html.match(/name="x"/g)).toHaveLength(2);
  });
  it('merges the attributes into <html> and <body>; the headmatter wins, class values are joined', () => {
    const own =
      '<html lang="en" class="dark"><head></head><body><app-root></app-root></body></html>';
    const parts = {
      head: '',
      body: '',
      htmlAttrs: { lang: 'de', class: 'brand', 'data-site': 'conf' },
      bodyAttrs: { class: 'has-banner' },
    };
    const html = injectIndexHtml(own, parts);
    expect(html).toContain('<html lang="en" class="dark brand" data-site="conf">');
    expect(html).toContain('<body class="has-banner">');
    // `lang="en"` is only the default when the headmatter sets no `lang`.
    expect(injectIndexHtml(own, parts, ['lang'])).toContain('<html class="dark brand" lang="de"');
  });
  it('leaves the page alone without parts, and keeps $ signs as they are', () => {
    expect(injectIndexHtml(page, { head: '', body: '' })).toBe(page);
    expect(injectIndexHtml(page, { head: "<script>a='$&'</script>", body: '' })).toContain(
      "<script>a='$&'</script>",
    );
  });
});

describe('rootIndexHtml', () => {
  it('joins the files of the roots in root order and skips roots without one', () => {
    const dir = mkdtempSync(join(tmpdir(), 'index-html-'));
    const roots = ['theme', 'addon', 'deck'].map((kind) => {
      mkdirSync(join(dir, kind));
      return { kind, dir: join(dir, kind) };
    });
    writeFileSync(join(dir, 'theme', 'index.html'), '<head><meta name="theme"></head>');
    writeFileSync(
      join(dir, 'deck', 'index.html'),
      '<head><meta name="deck"></head><body><p>after</p></body>',
    );
    expect(rootIndexHtml(roots)).toEqual({
      head: '<meta name="theme">\n<meta name="deck">',
      body: '<p>after</p>',
      htmlAttrs: {},
      bodyAttrs: {},
    });
  });
  it('puts the base in front of root addresses and merges the attributes in root order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'index-html-'));
    const roots = ['theme', 'deck'].map((kind) => {
      mkdirSync(join(dir, kind));
      return { kind, dir: join(dir, kind) };
    });
    writeFileSync(
      join(dir, 'theme', 'index.html'),
      '<html class="t" data-site="theme"><body class="tb"></body></html>',
    );
    writeFileSync(
      join(dir, 'deck', 'index.html'),
      `<html class="d" data-site="deck"><head>
<link rel="stylesheet" href="/brand.css">
<link rel="preconnect" href="https://fonts.example">
<script src='/analytics.js' defer></script>
<script src="//cdn.example/x.js"></script>
<a href="/4">slide</a>
</head><body><img src="/logo.png"></body></html>`,
    );
    const parts = rootIndexHtml(roots, '/talk/');
    expect(parts.head).toContain(
      '<link data-beasties-skip rel="stylesheet" href="/talk/brand.css">',
    );
    expect(parts.head).toContain('<link rel="preconnect" href="https://fonts.example">');
    expect(parts.head).toContain("<script src='/talk/analytics.js' defer>");
    expect(parts.head).toContain('<script src="//cdn.example/x.js">');
    expect(parts.head).toContain('<a href="/talk/4">');
    expect(parts.body).toBe('<img src="/talk/logo.png">');
    expect(parts.htmlAttrs).toEqual({ class: 't d', 'data-site': 'deck' });
    expect(parts.bodyAttrs).toEqual({ class: 'tb' });
    expect(rootIndexHtml(roots, './').body).toBe('<img src="logo.png">');
    expect(rootIndexHtml(roots).body).toBe('<img src="/logo.png">');
  });
});
