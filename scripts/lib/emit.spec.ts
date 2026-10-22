import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LAYOUTS, layoutName } from './layouts.mjs';
import {
  closeEntities,
  keepSpaces,
  safeLinks,
  slideSource,
  usesCustomElements,
  warnInlineControlFlow,
} from './emit.mjs';
import { indexSource, plainTitle } from './index-source.mjs';
import { parseDeck } from './parse-deck.mjs';
import { initHighlighter } from './code/highlighter.mjs';
import { BUILTIN_ELEMENTS, COMPONENTS } from './registry.mjs';

// Code fences are highlighted while generating, so the highlighter must be ready.
beforeAll(() => initHighlighter({ langs: ['ts', 'html'] }));

const slide = (frontmatter: Record<string, unknown>, content: string) => ({
  title: null,
  frontmatter,
  content,
  note: undefined,
});

describe('layoutName', () => {
  it('first slide defaults to cover, the others to default', () => {
    expect(layoutName({}, 0)).toBe('cover');
    expect(layoutName({}, 1)).toBe('default');
  });
  it('uses the layout from the frontmatter', () => {
    expect(layoutName({ layout: 'center' }, 0)).toBe('center');
  });
  it('falls back to default for an unknown layout, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(layoutName({ layout: 'nope' }, 3)).toBe('default');
    expect(warn.mock.calls[0][0]).toContain('unknown layout "nope"');
    expect(warn.mock.calls[0][0]).toContain('two-cols-header'); // the message lists the real names
    warn.mockRestore();
  });
  it('names the nearest layout for a typo', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(layoutName({ layout: 'image-rigth' }, 3)).toBe('default');
    expect(warn.mock.calls[0][0]).toContain(
      'unknown layout "image-rigth", using "default". Did you mean "image-right"?',
    );
    warn.mockRestore();
  });
  it('knows every Slidev layout', () => {
    const names = [
      'default',
      'cover',
      'center',
      'end',
      'fact',
      'full',
      'image',
      'image-left',
      'image-right',
      'iframe',
      'iframe-left',
      'iframe-right',
      'intro',
      'none',
      'quote',
      'section',
      'statement',
      'two-cols',
      'two-cols-header',
      '404',
      'error',
    ];
    expect(Object.keys(LAYOUTS).sort()).toEqual(names.sort());
  });
});

describe('slideSource', () => {
  it('wraps the content in its layout and imports it', () => {
    const src = slideSource(slide({ layout: 'center' }, '# Hi'), 2);
    expect(src).toContain('<sn-center><h1>Hi</h1>');
    expect(src).toContain("import { CenterLayout } from '../../app/layouts/center';");
    expect(src).toContain('imports: [CenterLayout]');
    expect(src).toContain('export default class Slide002');
  });
  it('carries the frontmatter class to the layout element', () => {
    expect(slideSource(slide({ class: 'text-center a"b' }, 'x'), 2)).toContain(
      '<sn-default class=\\"text-center a&quot;b\\">',
    );
  });
  it('splits two-cols content at ::right::', () => {
    const src = slideSource(slide({ layout: 'two-cols' }, 'left\n\n::right::\n\nright'), 2);
    expect(src).toContain('<p>left</p>\\n<ng-container ngProjectAs=\\"[right]\\"><p>right</p>');
  });
  it('imports only the components the slide uses', () => {
    const plain = slideSource(slide({}, 'text'), 2);
    expect(plain).not.toContain('Counter');
    expect(plain).not.toContain('SlideNgClick');
    const rich = slideSource(
      slide({}, '<app-counter [start]="1" />\n\n<div slide-ng-click>a</div>'),
      2,
    );
    expect(rich).toContain('imports: [DefaultLayout, SlideNgClick, Counter]');
  });
  it('does not import a component that is only mentioned inside code', () => {
    const src = slideSource(
      slide({}, '```html\n<app-counter />\n<div slide-ng-click>\n```\n\nand `<slide-ng-clicks>`'),
      2,
    );
    expect(src).toContain('imports: [DefaultLayout, CodeBlockWrapper]'); // the fence itself is a code block
    expect(src).not.toContain('Counter');
  });
  it('detects slide-ng-clicks, [slide-ng-click] bindings and slide-ng-after', () => {
    expect(slideSource(slide({}, '<slide-ng-clicks>\n\n- a\n\n</slide-ng-clicks>'), 2)).toContain(
      'SlideNgClicks',
    );
    expect(slideSource(slide({}, '<div [slide-ng-click]="[1,2]">a</div>'), 2)).toContain(
      'SlideNgClick',
    );
    expect(slideSource(slide({}, '<div slide-ng-after>a</div>'), 2)).toContain('SlideNgClick');
  });
  it('provides clicksStart when the frontmatter sets it', () => {
    expect(slideSource(slide({ clicksStart: 2 }, 'x'), 2)).toContain(
      '{ provide: CLICKS_START, useValue: 2 }',
    );
    expect(slideSource(slide({}, 'x'), 2)).not.toContain('useValue');
  });
  it('turns a markdown link to a routeAlias into a slide link, and imports it', () => {
    const deck = { slides: [slide({}, 'a'), slide({ routeAlias: 'pricing' }, 'b')] };
    const src = slideSource(slide({}, '[p](/pricing) [q](/other)'), 1, deck);
    expect(src).toContain('<slide-ng-link to=\\"pricing\\">p</slide-ng-link>');
    expect(src).toContain('<a href=\\"/other\\">q</a>');
    expect(src).toContain('SlideLink');
  });
  it('writes the template as one safe string literal', () => {
    const src = slideSource(slide({}, '```ts\nconst a = `x`; "q"\n```'), 2);
    expect(src).toMatch(/template: ".*"/);
  });
});

describe('slideSource: layout props and slots', () => {
  it('passes frontmatter keys the layout knows as attributes', () => {
    const src = slideSource(
      slide({ layout: 'image-left', image: '/a.png', backgroundSize: 'contain', other: 1 }, 'x'),
      2,
    );
    expect(src).toContain('<sn-image-left image=\\"/a.png\\" backgroundSize=\\"contain\\">');
    expect(src).not.toContain('other');
  });
  it('binds a list or an object to the layout input, keeps text and numbers as attributes', () => {
    const layouts = {
      ...LAYOUTS,
      brief: { ...LAYOUTS['default'], tag: 'deck-brief', props: ['owners', 'code', 'meta'] },
    };
    const src = slideSource(
      slide({ layout: 'brief', owners: ['Priya', 'Jonas'], code: 7, meta: { a: 1 } }, 'x'),
      2,
      { layouts },
    );
    expect(src).toContain(
      '<deck-brief [owners]=\\"[&quot;Priya&quot;,&quot;Jonas&quot;]\\" code=\\"7\\" [meta]=\\"&#123;&quot;a&quot;:1&#125;\\">',
    );
  });
  it('sends `class` to the content for layouts with a class prop, to the layout element otherwise', () => {
    expect(slideSource(slide({ layout: 'two-cols', class: 'c' }, 'x'), 2)).toContain(
      '<sn-two-cols contentClass=',
    );
    expect(slideSource(slide({ layout: 'fact', class: 'c' }, 'x'), 2)).toContain('<sn-fact class=');
  });
  it('handles several named slots, in any order', () => {
    const src = slideSource(
      slide({ layout: 'two-cols-header' }, 'top\n\n::right::\nR\n\n::left::\nL\n\n::bottom::\nB'),
      2,
    );
    expect(src.indexOf('[right]')).toBeLessThan(src.indexOf('[left]'));
    expect(src).toContain('ngProjectAs=\\"[bottom]\\"');
    expect(src).toContain('<p>top</p>');
  });
  it('warns about a slot the layout does not have and keeps the content visible', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const src = slideSource(slide({ layout: 'center' }, 'a\n\n::nope::\nb'), 2);
    expect(warn.mock.calls[0][0]).toContain('no slot "nope"');
    expect(src).toContain('<p>b</p>');
    expect(src).not.toContain('ngProjectAs');
    warn.mockRestore();
  });
  it('does not read ::x:: inside a code fence as a slot', () => {
    expect(slideSource(slide({ layout: 'two-cols' }, '```\n::right::\n```'), 2)).not.toContain(
      'ngProjectAs',
    );
  });
});

describe('slideSource: styles and clicks', () => {
  it('moves a <style> block into the component, scoped to the slide tag', () => {
    const src = slideSource(slide({}, '# A\n\n<style>\nh1 { color: red }\n</style>'), 7);
    expect(src).not.toContain('<style');
    expect(src).toContain('styles: ["slide-007 {\\nh1 { color: red }\\n}"]');
    expect(src).toContain('ViewEncapsulation.None');
  });
  it('leaves a <style> inside a code fence alone', () => {
    const src = slideSource(slide({}, '```html\n<style>a{}</style>\n```'), 2);
    expect(src).not.toContain('styles:');
  });
  it('provides a click total from the `clicks` frontmatter', () => {
    expect(slideSource(slide({ clicks: 4 }, 'x'), 2)).toContain(
      '{ provide: CLICKS_TOTAL, useValue: 4 }',
    );
  });
});

describe('indexSource', () => {
  it('lists every slide with its metadata and keeps unknown frontmatter keys', async () => {
    const deck = await parseDeck('/d/slides.md', {
      '/d/slides.md':
        '---\ntitle: T\n---\n\n# A\n\n---\nlayout: center\nfoo: bar\nroute\u0041lias: intro\nhideInToc: true\ntransition: fade\n---\n\n## B\n\n<!-- n -->\n',
    });
    const src = indexSource(deck);
    expect(src).toContain("import Slide001 from './slide-001';");
    expect(src).toContain('"layout":"center"');
    expect(src).toContain('"foo":"bar"');
    expect(src).toContain('"note":"n"');
    expect(src).toContain('"routeAlias":"intro"');
    expect(src).toContain('"hideInToc":true');
    expect(src).toContain('"transition":"fade"');
    expect(src).toContain('"level":2');
    expect(src).toContain('export const HEADMATTER');
    expect(src.match(/component: Slide00\d/g)?.length).toBe(2);
  });
  it('writes the pictures of each slide, with the base of the build', async () => {
    const deck = await parseDeck('/d/slides.md', {
      '/d/slides.md': '# A\n\n![a](/a.png)\n\n---\nlayout: image\nimage: /b.jpg\n---\n',
    });
    const built = { ...deck, root: undefined, assetBase: '/talk/' }; // a deck in memory: no folder to copy files from
    deck.slides.forEach((s, i) => slideSource(s, i + 1, built));
    const src = indexSource(deck);
    expect(src).toContain('"images":["/talk/a.png"]');
    expect(src).toContain('"images":["/talk/b.jpg"]');
  });
});

describe('plainTitle', () => {
  it('drops the markdown of a heading, keeps words with underscores', () => {
    expect(plainTitle('With `code` and [a link](https://x.org)')).toBe('With code and a link');
    expect(plainTitle('**Bold** and _it_ and snake_case_name')).toBe(
      'Bold and it and snake_case_name',
    );
    expect(plainTitle('H<sub>2</sub>O and <ruby>振<rt>ふ</rt></ruby>り仮名')).toBe(
      'H2O and 振り仮名',
    );
  });
  it('keeps the TeX of $math$ without its dollars, and drops markdown escapes', () => {
    expect(plainTitle('Karmaşıklık $O(1)$')).toBe('Karmaşıklık O(1)');
    expect(plainTitle('**Fast** $a_1 * b_2$ and $5 or \\*not\\*')).toBe(
      'Fast a_1 * b_2 and $5 or *not*',
    );
  });
  it('drops bidi overrides, which would reorder the table of contents', () => {
    expect(plainTitle('annexe\u202Egpj.exe \u2067x\u2069')).toBe('annexegpj.exe x');
  });
});

describe('slideSource: built-in components are imported when the slide uses them', () => {
  const imports = (md: string) => /imports: \[(.*)\]/.exec(slideSource(slide({}, md), 2))![1];
  it('finds each tag', () => {
    expect(imports('<slide-ng-arrow x1="1" y1="1" x2="2" y2="2" />')).toContain('Arrow');
    expect(imports('<slide-ng-auto-fit-text>x</slide-ng-auto-fit-text>')).toContain('AutoFitText');
    expect(imports('<slide-ng-transform scale="0.5">x</slide-ng-transform>')).toContain(
      'Transform',
    );
    expect(imports('<slide-ng-youtube id="a" />')).toContain('Youtube');
    expect(imports('<slide-ng-video slide-ng-click></slide-ng-video>')).toContain('SlideVideo');
    expect(imports('<slide-ng-tweet id="20" />')).toContain('Tweet');
    expect(imports('<slide-ng-blue-sky uri="at://x" />')).toContain('BlueSky');
  });
  it('finds slide-ng-mark (with modifiers, or as a binding) and slide-ng-motion', () => {
    expect(imports('<span slide-ng-mark.red="1">x</span>')).toContain('SlideNgMark');
    expect(imports('<span [slide-ng-mark]="{ at: 2 }">x</span>')).toContain('SlideNgMark');
    expect(imports('<div slide-ng-motion :enter="{ x: 0 }">x</div>')).toContain('SlideNgMotion');
  });
  it('imports common directives and pipes from @angular/common in one line', () => {
    const src = slideSource(
      slide({}, '<ng-container *ngTemplateOutlet="t" />\n\n{{ 0.5 | percent }}'),
      2,
    );
    expect(src).toContain("import { NgTemplateOutlet, PercentPipe } from '@angular/common';");
    expect(src).toContain('imports: [DefaultLayout, NgTemplateOutlet, PercentPipe]');
  });
  it('reads a <code> written in HTML as live markup, and markdown code as text', () => {
    expect(imports("<code>{{ 'a' | uppercase }}</code>")).toContain('UpperCasePipe');
    expect(imports("`{{ 'a' | uppercase }}`")).toBe('DefaultLayout');
  });
  it('does not mix <slide-ng-transform> up with the longer names or other words', () => {
    expect(imports('plain text about a transformation')).toBe('DefaultLayout');
  });
  it('does not import a component for a longer, mistyped tag', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(imports('<slide-ng-tocc />')).toBe('DefaultLayout');
    expect(imports('<slide-ng-toc />')).toBe('DefaultLayout, SlideToc');
    warn.mockRestore();
  });
});

describe('slideSource: unknown slide-ng names', () => {
  const warnings = (md: string, components?: { selector: string; test: RegExp }[]) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slideSource(slide({}, md), 2, components ? { components } : {});
    const calls = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    return calls;
  };
  it('names the nearest built-in element or attribute', () => {
    expect(warnings('<slide-ng-tocc />')).toEqual([
      '[slides] slide 2: <slide-ng-tocc> is not a slide.ng name. Did you mean <slide-ng-toc>?',
    ]);
    expect(warnings('<div slide-ng-clik>a</div>')).toEqual([
      '[slides] slide 2: slide-ng-clik is not a slide.ng name. Did you mean "slide-ng-click"?',
    ]);
  });
  it('warns for any unknown slide-ng name, and says when an attribute is written as a tag', () => {
    expect(warnings('<slide-ng-fancy-thing />')).toEqual([
      '[slides] slide 2: <slide-ng-fancy-thing> is not a slide.ng name.',
    ]);
    expect(warnings('<slide-ng-click>a</slide-ng-click>')).toEqual([
      '[slides] slide 2: <slide-ng-click> is not a slide.ng name. It is an attribute: <div slide-ng-click>.',
    ]);
  });
  it("accepts the built-in names, their bindings and modifiers, and the deck's own slide-ng-* components", () => {
    expect(
      warnings(
        '<slide-ng-clicks>\n\n- a\n\n</slide-ng-clicks>\n\n<span [slide-ng-click]="2" slide-ng-mark.red>b</span>',
      ),
    ).toEqual([]);
    expect(
      warnings('<slide-ng-badge />', [{ selector: 'slide-ng-badge', test: /<slide-ng-badge/ }]),
    ).toEqual([]);
  });
  it('knows every element the registry imports, the progress bar too', () => {
    expect(warnings('<slide-ng-progress-bar position="top" />')).toEqual([]);
    const tags = COMPONENTS.flatMap((c) => /<(slide-ng-[\w-]+)/.exec(String(c.test))?.[1] ?? []);
    expect(tags.filter((t) => !BUILTIN_ELEMENTS.includes(t))).toEqual([]);
  });
});

describe('slideSource: drag positions and renamed names', () => {
  it('warns about a drag position name that dragPos does not have', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slideSource(
      slide({ dragPos: { square: '1,2,3,4' } }, '<div slide-ng-drag="square">a</div>'),
      2,
    );
    expect(warn).not.toHaveBeenCalled();
    slideSource(slide({}, '<div slide-ng-drag="circle">a</div>'), 3);
    expect(warn.mock.calls[0][0]).toContain('"circle" is not in this slide\'s dragPos');
    warn.mockRestore();
  });
  it('warns about a Vue slot template', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slideSource(slide({}, '<slide-ng-switch><template #1>a</template></slide-ng-switch>'), 2);
    expect(warn.mock.calls[0][0]).toContain("Vue's slot syntax");
    warn.mockRestore();
  });
  it('lists every renamed name of a slide at once', () => {
    expect(() =>
      slideSource(slide({}, '<v-clicks>\n\n- a\n\n</v-clicks>\n\n<div v-click>b</div>'), 2),
    ).toThrow(/slide 2: "<v-clicks>" was renamed to .*"v-click" was renamed to/);
  });
});

describe('keepSpaces', () => {
  it('keeps a space between two tags on one line, like Vue', () => {
    expect(keepSpaces('<p><strong>bold</strong> <em>italic</em></p>')).toBe(
      '<p><strong>bold</strong>&ngsp;<em>italic</em></p>',
    );
  });
  it('leaves line breaks between blocks and code samples alone', () => {
    expect(keepSpaces('<h1>a</h1>\n<p>b</p>')).toBe('<h1>a</h1>\n<p>b</p>');
    expect(keepSpaces('<pre><span>a</span> <span>b</span></pre>')).toBe(
      '<pre><span>a</span> <span>b</span></pre>',
    );
    // a Twoslash popup holds its own <pre> inside the code block
    const nested =
      '<pre class="shiki"><span>a</span><pre>x</pre><span>b</span> <span>c</span></pre> <b>d</b>';
    expect(keepSpaces(nested)).toBe(
      '<pre class="shiki"><span>a</span><pre>x</pre><span>b</span> <span>c</span></pre>&ngsp;<b>d</b>',
    );
  });
});

describe('custom elements', () => {
  it('gives the schema only to slides that use a listed web component', () => {
    const deck = { headmatter: { customElements: ['model-viewer', 'sl-*'] } };
    const used = slideSource(slide({}, '<model-viewer src="a.glb"></model-viewer>'), 2, deck);
    expect(used).toContain('schemas: [CUSTOM_ELEMENTS_SCHEMA]');
    expect(used).toContain("import { CUSTOM_ELEMENTS_SCHEMA, Component } from '@angular/core';");
    expect(slideSource(slide({}, '<other-thing></other-thing>'), 2, deck)).not.toContain('schemas');
    expect(slideSource(slide({}, '<model-viewer></model-viewer>'), 2)).not.toContain('schemas');
  });
  it('matches names, prefixes and true', () => {
    expect(usesCustomElements('<sl-button>', ['sl-*'])).toBe(true);
    expect(usesCustomElements('<sl-button>', 'sl-button')).toBe(true);
    expect(usesCustomElements('<sl-button>', ['model-viewer'])).toBe(false);
    expect(usesCustomElements('<x-y>', true)).toBe(true);
    expect(usesCustomElements('<p>', true)).toBe(false);
  });
});

describe('closeEntities', () => {
  it('closes the old entities without ;, outside code', () => {
    expect(closeEntities('<p>Option&ltA> &copy 2024 &lt; &ltimes;</p>')).toBe(
      '<p>Option&lt;A> &copy; 2024 &lt; &ltimes;</p>',
    );
    expect(closeEntities('<pre>&amp</pre>')).toBe('<pre>&amp</pre>');
    expect(closeEntities('<a href="/s?q=x&copy=1">a</a>')).toBe('<a href="/s?q=x&copy=1">a</a>');
    expect(closeEntities('<img alt="&copy 2024">')).toBe('<img alt="&copy; 2024">');
    expect(closeEntities('<a title="a>b" href="?x&copy=1">a</a>')).toBe(
      '<a title="a>b" href="?x&copy=1">a</a>',
    );
  });
});

describe('safeLinks', () => {
  it('replaces script addresses in href and src, and leaves normal ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(safeLinks('<a href="javascript:alert(1)">x</a> <a href="https://a.b">y</a>', 3)).toBe(
      '<a href="#">x</a> <a href="https://a.b">y</a>',
    );
    expect(safeLinks("<iframe src=' JavaScript:x'></iframe>", 3)).toBe('<iframe src="#"></iframe>');
    // a quote of the other kind, an entity or a tab in the scheme, and no quotes at all
    expect(safeLinks(`<a href="javascript:alert('x')">a</a>`, 3)).toBe('<a href="#">a</a>');
    expect(safeLinks('<a href="java&#115;cript:x">a</a>', 3)).toBe('<a href="#">a</a>');
    expect(safeLinks('<a href="java\tscript:x">a</a>', 3)).toBe('<a href="#">a</a>');
    expect(safeLinks('<a href=javascript:x>a</a>', 3)).toBe('<a href="#">a</a>');
    // a code sample that shows such a link is text and stays as it is
    const sample = '<p><code ngNonBindable>&lt;a href=javascript:x&gt;</code> here</p>';
    expect(safeLinks(sample, 3)).toBe(sample);
    expect(warn).toHaveBeenCalledTimes(6);
    warn.mockRestore();
  });
  it('replaces script documents in <object data> and <embed src>, not data-* attributes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(safeLinks('<object data="data:text/html,<script>x</script>"></object>', 3)).toBe(
      '<object data="#"></object>',
    );
    expect(safeLinks("<object data='javascript:x'></object>", 3)).toBe(
      '<object data="#"></object>',
    );
    expect(safeLinks('<embed src="data:text/html,x">', 3)).toBe('<embed src="#">');
    expect(safeLinks('<div data-x="javascript:x" data="a.svg"></div>', 3)).toBe(
      '<div data-x="javascript:x" data="a.svg"></div>',
    );
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe('slideSource warnings', () => {
  const warnings = (content: string) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slideSource(slide({}, content), 2);
    const all = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    return all;
  };
  it('says a <script> element is removed, but not for "<script" inside an attribute', () => {
    expect(warnings('<script>alert(1)</script>').join()).toContain('<script> is removed');
    expect(warnings('<div title="a <script> b">x</div>').join()).not.toContain('is removed');
  });
  it('says an inline event handler is kept and runs', () => {
    expect(warnings('<img src="a.png" onerror="x()">').join()).toContain('onerror=');
    expect(warnings('<button (click)="x()" title="onclick=no">a</button>').join()).not.toContain(
      'event handler',
    );
    expect(warnings('<div once="1" only="2">a</div>').join()).not.toContain('event handler');
  });
  it('names an element that is never closed instead of failing on the layout tag', () => {
    expect(() => slideSource(slide({}, '<div class="box">\n\ntext'), 4)).toThrow(
      /slide 4: <div class="box"> is never closed/,
    );
    expect(() => slideSource(slide({}, '<ul><li>a<li>b</ul>\n\n<p>text'), 4)).not.toThrow();
    expect(() => slideSource(slide({}, '@let n = 1;\n\n<div class="box">\n\ntext'), 4)).toThrow(
      /slide 4: <div class="box"> is never closed/,
    );
    expect(() => slideSource(slide({}, '@if (true) {\n\ntext'), 4)).toThrow(
      /slide 4: @if \(true\) \{ is never closed; add \} where the @if block should end/,
    );
  });
  it('names a control-flow block that is not complete (no raw NG5002 and false NG8113)', () => {
    expect(() => slideSource(slide({}, '@if (x >= 1 {\n\ntext\n\n}'), 4)).toThrow(
      'slide 4: "@if (x >= 1 {" is not a complete @if block: its ( is never closed (write @if (...) { ... }; an @ that is text is written &#64;)',
    );
    expect(() => slideSource(slide({}, '@if x > 1 {\n\ntext\n\n}'), 4)).toThrow(
      'is not a complete @if block: its condition goes in ( )',
    );
  });
  it('warns that an @let without its ; is text', () => {
    expect(warnings('@let pct = 5\n\n{{ pct }}').join()).toContain(
      'slide 2: "@let pct = 5" has no ; at its end, so it is shown as text and declares nothing: end it with ;',
    );
    expect(warnings('@let pct = 5;\n\n{{ pct }}').join()).not.toContain('@let');
  });
  it('stops on a value of $nav called as a signal ($nav.total())', () => {
    expect(() => slideSource(slide({}, 'Of {{ $nav.total() }}'), 4)).toThrow(
      'slide 4: $nav.total is a number, not a signal: write $nav.total without the ()',
    );
    expect(() => slideSource(slide({}, 'Of {{ $nav.total }}'), 4)).not.toThrow();
  });
  it('names an inline element left open, not the </p> after it (no raw NG5002)', () => {
    expect(() =>
      slideSource(slide({}, 'At <span class="font-bold">14:02 a migration ran.'), 4),
    ).toThrow(/slide 4: <span class="font-bold"> is never closed; add <\/span>/);
  });
  it('says the names differ when a mistyped element is closed', () => {
    expect(() =>
      slideSource(slide({}, '<slide-ng-clicsk>\n\n- a\n- b\n\n</slide-ng-clicks>'), 4),
    ).toThrow(
      'slide 4: <slide-ng-clicsk> is closed by </slide-ng-clicks>, a different name. Did you mean <slide-ng-clicks>?',
    );
    expect(() => slideSource(slide({}, '<div class="x">a</dvi>'), 4)).toThrow(
      'slide 4: <div class="x"> is closed by </dvi>, a different name. Write both names the same.',
    );
  });
  it('names a closing tag that closes nothing', () => {
    expect(() => slideSource(slide({}, '<div>a</div>\n\n</div>'), 4)).toThrow(
      /slide 4: <\/div> has no <div> open to close/,
    );
  });
});

describe('warnInlineControlFlow', () => {
  it('warns about @if in the middle of a line, not on its own line or in code', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnInlineControlFlow('Status: @if (on) { yes }', 2);
    warnInlineControlFlow('@if (on) {\nyes\n} @else if (x) {\nno\n}', 2);
    warnInlineControlFlow('Use `x @if (y) {` like this\n\n```ts\nconst a = 1; @if (b) {\n```', 2);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('slide 2');
    warn.mockRestore();
  });
});

describe('slideSource: pictures that public/ does not have', () => {
  const root = mkdtempSync(join(tmpdir(), 'slide-ng-public-'));
  mkdirSync(join(root, 'public/img'), { recursive: true });
  writeFileSync(join(root, 'public/img/logo.png'), 'png');
  const warnings = (frontmatter: Record<string, unknown>, md: string) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slideSource(slide(frontmatter, md), 2, { root, roots: [{ dir: root }] });
    const calls = warn.mock.calls.map((c) => String(c[0]));
    warn.mockRestore();
    return calls;
  };
  it('warns about a root address that is not a file of public/', () => {
    expect(warnings({}, '![](/img/logo.png)\n\n<img src="/missing.png">')).toEqual([
      '[slides] slide 2: the picture "/missing.png" is not in public/ (an address that starts with / is a file of the public/ folder next to slides.md)',
    ]);
    expect(warnings({ layout: 'image-right', image: '/nope.jpg' }, '# A')).toEqual([
      expect.stringContaining('the picture "/nope.jpg" is not in public/'),
    ]);
  });
  it('says to leave out /public in the address', () => {
    expect(warnings({}, '![](/public/img/logo.png)')).toEqual([
      '[slides] slide 2: "/public/img/logo.png" names the public/ folder, which is the site\'s root: write "/img/logo.png"',
    ]);
  });
  it('leaves remote pictures and code samples alone', () => {
    expect(
      warnings(
        {},
        '![](https://example.com/a.png) ![](//cdn.example.com/b.png)\n\n`<img src="/x.png">`',
      ),
    ).toEqual([]);
  });
});
