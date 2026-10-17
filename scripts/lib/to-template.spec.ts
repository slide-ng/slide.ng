import { toTemplate } from './to-template.mjs';
import { initHighlighter } from './code/highlighter.mjs';

beforeAll(() => initHighlighter({ langs: ['ts', 'html', 'md'] }));

// The words of some HTML, without the tags.
const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('toTemplate: Angular syntax is protected', () => {
  it('keeps {{ interpolation }} as written', () => {
    expect(toTemplate('Count is {{ count() + 1 }}.')).toContain(
      '<p>Count is {{ count() + 1 }}.</p>',
    );
  });
  it('keeps @if blocks as written', () => {
    const html = toTemplate('@if (a > 1) {\nbig\n} @else {\nsmall\n}');
    expect(html).toContain('@if (a > 1) {');
    expect(html).toContain('} @else {');
    expect(html).toContain('big');
  });
  it('keeps @for and @let lines', () => {
    const html = toTemplate('@let n = 3;\n\n@for (i of items; track i) {\n{{ i }}\n}');
    expect(html).toContain('@let n = 3;');
    expect(html).toContain('@for (i of items; track i) {');
  });
  it('keeps tags with bindings, events and template references untouched', () => {
    const html = toTemplate('<app-counter #c [start]="5" (changed)="x = $event" />');
    expect(html).toContain('<app-counter #c [start]="5" (changed)="x = $event" />');
  });
  it('keeps a binding tag that sits inside a paragraph', () => {
    expect(toTemplate('Hello <b [class.x]="a">there</b>')).toContain('<b [class.x]="a">');
  });
  it('still renders markdown around it', () => {
    expect(toTemplate('**bold** {{ x }}')).toContain('<strong>bold</strong> {{ x }}');
  });
});

describe('toTemplate: plain text is made safe', () => {
  it('escapes a lone @ and braces in normal text', () => {
    const html = toTemplate('mail me@example.com {not a block}');
    expect(html).toContain('me&#64;example.com');
    expect(html).toContain('&#123;not a block&#125;');
  });
  it('treats plain HTML attributes like slide-ng-click as normal markup', () => {
    expect(toTemplate('<div slide-ng-click="2">hi</div>')).toContain(
      '<div slide-ng-click="2">hi</div>',
    );
  });
});

describe('toTemplate: code is literal', () => {
  const fence = '```ts\nconst o = { a: 1 }; // @Component {{ x }} <b>\n```';
  it('escapes braces, @, {{ and < in a code fence', () => {
    const html = toTemplate(fence);
    expect(html).toContain('<pre ngNonBindable');
    expect(text(html)).toContain(
      'const o = &#123; a: 1 &#125;; // &#64;Component &#123;&#123; x &#125;&#125; &#x3C;b>',
    );
    expect(html).not.toContain('{');
    expect(html).not.toContain('@');
  });
  it('does not touch Angular syntax inside a fence', () => {
    const html = toTemplate('```html\n@if (x) {\n<app-counter [start]="1" />\n}\n```');
    expect(html).not.toContain('@if');
    expect(text(html)).toContain('&#x3C;app-counter [start]="1" />');
  });
  it('keeps a blank line and --- inside a fence', () => {
    expect(text(toTemplate('```md\na\n\n---\nb\n```'))).toContain('a\n\n---\nb');
  });
  it('makes inline code literal too', () => {
    const html = toTemplate('Use `{{ x }}` and `@if` here');
    expect(html).toContain('<code ngNonBindable>&#123;&#123; x &#125;&#125;</code>');
    expect(html).toContain('<code ngNonBindable>&#64;if</code>');
  });
  it('keeps the lines inside a wrapper tag with bindings as they are, like the same tag without them', () => {
    const md = '<card-frame [accent]="true">\n<b card-title>T</b>\nbody\n</card-frame>';
    expect(toTemplate(md)).toBe(
      '<card-frame [accent]="true">\n<b card-title>T</b>\nbody\n</card-frame>',
    );
    expect(toTemplate('<ng-template #row let-p>\n**{{ p }}**\n</ng-template>')).not.toContain(
      '<p>',
    );
  });
  it('draws a code fence inside a list item', () => {
    const html = toTemplate('- A shell:\n\n  ```bash\n  npm ci\n  ```\n- next');
    expect(html).toContain('<pre');
    expect(html).not.toContain('NGFENCE');
    expect(html).not.toContain('<code>`</code>');
  });
  it('keeps an inline tag with a binding at the start of a line in its paragraph', () => {
    expect(toTemplate(`<span [title]="'x'">A</span>\n\n<span [title]="'y'">B</span>`)).toBe(
      `<p><span [title]="'x'">A</span></p>\n<p><span [title]="'y'">B</span></p>\n`,
    );
  });
  it('joins a tag or @let written over several lines', () => {
    const html = toTemplate('<input\n  type="range"\n  [value]="v()"\n  (input)="set($event)"\n/>');
    expect(html).toContain('<input type="range" [value]="v()" (input)="set($event)"/>');
    expect(html).not.toContain('&lt;');
    expect(toTemplate("@let team = [\n  'a',\n  'b',\n];\n\n{{ team.length }}")).toContain(
      "@let team = [ 'a', 'b', ];",
    );
  });
  it('reads \\| in inline code of a table cell as a pipe, and keeps it elsewhere', () => {
    expect(toTemplate('| a | b |\n|---|---|\n| `x \\| y` | 1 |')).toContain(
      '<code ngNonBindable>x | y</code>',
    );
    expect(toTemplate('Escape it as `a \\| b`.')).toContain('<code ngNonBindable>a \\| b</code>');
  });
});

describe('toTemplate: highlighted code', () => {
  it('wraps the highlighted block in a slide-ng-code-block-wrapper with its ranges and options', () => {
    const html = toTemplate(
      "```ts [a.ts] {1|2} {lines:true,startLine:3,maxHeight:'80px'}\nlet a;\nlet b;\n```",
    );
    expect(html).toContain(
      '<slide-ng-code-block-wrapper ranges="1|2" title="a.ts" lines="true" startLine="3" maxHeight="80px">',
    );
    expect(html).toContain('class="shiki shiki-themes vitesse-light vitesse-dark slidev-code"');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
  });
  it('uses the deck-wide lineNumbers and codeCopy settings', () => {
    const html = toTemplate('```ts\nlet a;\n```', {
      headmatter: { lineNumbers: true, codeCopy: false },
    });
    expect(html).toContain('lines="true"');
    expect(html).toContain('noCopy="true"');
  });
  it('shows an unknown language as plain text, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = toTemplate('```zzz\nhello\n```');
    expect(text(html)).toContain('hello');
    expect(warn.mock.calls[0][0]).toContain('"zzz"');
    warn.mockRestore();
  });
  it('wraps a ::code-group in <slide-ng-code-group>', () => {
    const html = toTemplate(
      '::code-group\n\n```ts [a]\nlet a;\n```\n\n```ts [b]\nlet b;\n```\n\n::',
    );
    expect(html.startsWith('<slide-ng-code-group><slide-ng-code-block-wrapper')).toBe(true);
    expect(html.match(/<slide-ng-code-block-wrapper/g)).toHaveLength(2);
  });
});

describe('toTemplate: twoslash', () => {
  it('adds type popups only to a block marked twoslash, and the result is safe for Angular', async () => {
    await initHighlighter({ langs: ['ts'], twoslash: true });
    const html = toTemplate(
      '```ts twoslash\nconst n = Math.max(1, 2)\n//    ^?\n```\n\n```ts\nconst m = 1\n```',
    );
    expect(html.match(/twoslash-hover/g)!.length).toBeGreaterThan(1);
    expect(html.match(/<pre /g)).toHaveLength(2);
    expect(html.split('<slide-ng-code-block-wrapper')[2]).not.toContain('twoslash-hover');
    expect(html).not.toMatch(/[{}@]/);
    await initHighlighter({ langs: ['ts', 'html', 'md'] }); // back to the plain setup for the other tests
    // The first twoslash run loads the TypeScript libraries, which is slow on a busy machine.
  }, 30_000);
});
