// @vitest-environment node
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { externalScripts, moveInlineScripts } from './csp.mjs';

const LOADER = `document.querySelectorAll('link[data-beasties-media]').forEach(function(l){l.media=l.getAttribute('data-beasties-media')})`;
const PAGE = `<html><head><script>(function(){window.early=1})()</script></head><body>
<script src="main-X.js" type="module"></script><script>${LOADER}</script></body></html>`;

describe('externalScripts', () => {
  it('moves every inline script to a file of its own, in the same place', () => {
    const { html, files } = externalScripts(PAGE);
    expect(html).not.toMatch(/<script>/);
    expect(files.map((f) => f.text)).toEqual(['(function(){window.early=1})()', LOADER]);
    for (const f of files) {
      expect(f.name).toMatch(/^inline-[0-9a-f]{12}\.js$/);
      expect(html).toContain(`<script src="${f.name}"></script>`);
    }
    expect(html.indexOf(files[0].name)).toBeLessThan(html.indexOf('main-X.js'));
    expect(html.indexOf('main-X.js')).toBeLessThan(html.indexOf(files[1].name));
  });
  it('leaves scripts with a src, JSON data and pages without inline scripts alone', () => {
    const page = `<script src="a.js"></script><script type="application/ld+json">{"a":1}</script>`;
    expect(externalScripts(page)).toEqual({ html: page, files: [] });
  });
});

describe('moveInlineScripts', () => {
  it('rewrites index.html and writes the scripts next to it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-'));
    writeFileSync(join(dir, 'index.html'), PAGE);
    const files = moveInlineScripts(dir);
    expect(files).toHaveLength(2);
    expect(readFileSync(join(dir, files[1]), 'utf8')).toBe(LOADER);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain(`<script src="${files[1]}">`);
  });
});
