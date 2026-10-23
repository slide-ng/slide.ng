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
    expect(externalScripts(page)).toEqual({ html: page, files: [], left: [] });
  });
  it('moves a module and a script with other attributes, keeping them', () => {
    const page = `<script data-cfasync="false" id='a'>window.a=1</script><script type="module">window.m=1</script>
<script type='text/javascript' defer>window.t=1</script><script type="module" async>window.n=1</script>`;
    const { html, files, left } = externalScripts(page);
    expect(left).toEqual([]);
    expect(files.map((f) => f.text)).toEqual([
      'window.a=1',
      'window.m=1',
      'window.t=1',
      'window.n=1',
    ]);
    expect(html).toBe(
      `<script data-cfasync="false" id="a" src="${files[0].name}"></script><script type="module" src="${files[1].name}"></script>
<script src="${files[2].name}"></script><script type="module" async src="${files[3].name}"></script>`,
    );
  });
  it('names the inline scripts it cannot move', () => {
    const page = `<script type="importmap">{"imports":{}}</script><script type="speculationrules">{}</script>`;
    expect(externalScripts(page)).toEqual({
      html: page,
      files: [],
      left: ['importmap', 'speculationrules'],
    });
  });
});

describe('moveInlineScripts', () => {
  it('rewrites index.html and writes the scripts next to it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-'));
    writeFileSync(join(dir, 'index.html'), PAGE);
    const warnings: string[] = [];
    const files = moveInlineScripts(dir, (m) => warnings.push(m));
    expect(warnings).toEqual([]);
    expect(files).toHaveLength(2);
    expect(readFileSync(join(dir, files[1]), 'utf8')).toBe(LOADER);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain(`<script src="${files[1]}">`);
  });
  it('warns about an inline script a strict host still refuses', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csp-'));
    writeFileSync(join(dir, 'index.html'), `<script type="importmap">{"imports":{}}</script>`);
    const warnings: string[] = [];
    expect(moveInlineScripts(dir, (m) => warnings.push(m))).toEqual([]);
    expect(warnings).toEqual([expect.stringContaining('<script type="importmap">')]);
  });
});
