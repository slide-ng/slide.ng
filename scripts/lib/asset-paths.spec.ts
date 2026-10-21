import { describe, expect, it } from 'vitest';
import { rebase, rebaseCss, rebaseHtml } from './asset-paths.mjs';
import { slideSource } from './emit.mjs';

const HTML =
  '<p><img src="/a.png" alt="x"></p><video src="/v.mp4" poster=\'/p.png\'></video><div style="background: url(/b.png)"></div>';

describe('rebase', () => {
  it('puts the base in front, or makes the address relative for ./', () => {
    expect(rebase('/a.png', '/talk/')).toBe('/talk/a.png');
    expect(rebase('/a/b.png', './')).toBe('a/b.png');
  });
});

describe('rebaseHtml', () => {
  it('leaves everything alone for the root base', () => {
    expect(rebaseHtml(HTML, '/')).toBe(HTML);
  });
  it('rewrites src, poster and url() under a path base', () => {
    const out = rebaseHtml(HTML, '/talk/');
    expect(out).toContain('src="/talk/a.png"');
    expect(out).toContain('src="/talk/v.mp4"');
    expect(out).toContain("poster='/talk/p.png'");
    expect(out).toContain('url(/talk/b.png)');
  });
  it('rewrites the printPoster of <slide-ng-video> too', () => {
    expect(
      rebaseHtml('<slide-ng-video printPoster="/still.png"></slide-ng-video>', '/talk/'),
    ).toContain('printPoster="/talk/still.png"');
  });
  it('makes them relative for an offline folder', () => {
    const out = rebaseHtml(HTML, './');
    expect(out).toContain('src="a.png"');
    expect(out).toContain('url(b.png)');
  });
  it('does not touch web addresses, protocol-relative addresses, relative ones or code samples', () => {
    const same =
      '<img src="https://x.test/a.png"><img src="//cdn.test/a.png"><img src="a.png"><pre><code>&lt;img src="/a.png"&gt; url(/b.png)</code></pre><code>src="/c.png"</code>';
    expect(rebaseHtml(same, '/talk/')).toBe(same);
  });
});

describe('rebaseCss', () => {
  const css =
    '.a { background: url("/a.png"); } .b { background: url(//cdn.test/b.png); } .c { background: url(c.png); }';
  it('prefixes a path base and leaves the rest', () => {
    expect(rebaseCss(css, '/talk/')).toBe(
      '.a { background: url("/talk/a.png"); } .b { background: url(//cdn.test/b.png); } .c { background: url(c.png); }',
    );
  });
  it('leaves slide styles alone for ./ (the build would try to bundle a relative address) and for the root base', () => {
    expect(rebaseCss(css, './')).toBe(css);
    expect(rebaseCss(css, '/')).toBe(css);
  });
});

describe('a generated slide', () => {
  const slide = {
    content: '# Hi\n\n![p](/pic.png)\n\n<style>\n.x { background: url(/pic.png); }\n</style>\n',
    frontmatter: {},
    file: 'slides.md',
  };
  it('gets the base in front of its pictures and styles', () => {
    const source = slideSource(slide, 1, { assetBase: '/talk/' });
    expect(source).toContain('src=\\"/talk/pic.png\\"');
    expect(source).toContain('url(/talk/pic.png)');
  });
  it('stays as written without a base (dev server)', () => {
    expect(slideSource(slide, 1, {})).toContain('src=\\"/pic.png\\"');
  });
});
