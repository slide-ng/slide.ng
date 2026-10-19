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
    expect(parts).toEqual({ head: '<meta name="a">', body: '<script>go()</script>' });
  });
  it('gives empty parts for missing elements', () => {
    expect(indexHtmlParts('<head><meta name="a"></head>')).toEqual({
      head: '<meta name="a">',
      body: '',
    });
    expect(indexHtmlParts('just text')).toEqual({ head: '', body: '' });
  });
});

describe('injectIndexHtml', () => {
  it('puts the head before </head> and the body after the app', () => {
    const html = injectIndexHtml(page, { head: '<meta name="x">', body: '<script>y()</script>' });
    expect(html).toContain('<meta name="x">\n</head>');
    expect(html).toContain('</app-root>\n<script>y()</script>');
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
    });
  });
});
