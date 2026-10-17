import { splitSlots } from './slots.mjs';
import { extractStyles, scopeCss } from './scoped-style.mjs';

describe('splitSlots', () => {
  it('has only the default slot when there is no marker', () => {
    expect(splitSlots('hello')).toEqual([['default', 'hello']]);
  });
  it('starts a new slot at each ::name:: line', () => {
    const slots = splitSlots('top\n::left::\nL\n::right::\nR');
    expect(slots.map(([n]) => n)).toEqual(['default', 'left', 'right']);
    expect(slots[1][1]).toBe('L');
  });
  it('lets ::default:: switch back, in any order', () => {
    const slots = splitSlots('::right::\nR\n::default::\nD');
    expect(Object.fromEntries(slots)).toEqual({ default: 'D', right: 'R' });
  });
  it('allows spaces and dashes in the marker', () => {
    expect(splitSlots(':: my-slot ::\nx').map(([n]) => n)).toEqual(['default', 'my-slot']);
  });
  it('ignores a marker inside a code fence or in the middle of a line', () => {
    expect(splitSlots('```\n::right::\n```')).toHaveLength(1);
    expect(splitSlots('see ::right:: here')).toHaveLength(1);
  });
});

describe('extractStyles', () => {
  it('cuts the style blocks out and returns their css', () => {
    const { markdown, css } = extractStyles('# A\n\n<style>\nh1 { color: red }\n</style>\n\ntext');
    expect(markdown).not.toContain('style');
    expect(markdown).toContain('text');
    expect(css).toBe('h1 { color: red }');
  });
  it('joins several blocks and ignores attributes like scoped', () => {
    expect(extractStyles('<style scoped>a{}</style>b<style>c{}</style>').css).toBe('a{}\nc{}');
  });
  it('leaves a style tag inside a code fence alone', () => {
    const md = '```html\n<style>a{}</style>\n```';
    expect(extractStyles(md)).toEqual({ markdown: md, css: '' });
  });
  it('leaves a style tag in inline code alone, and still finds the real block', () => {
    const { markdown, css } = extractStyles(
      'Write a `<style>` block:\n\n<style>\nh1 { color: red }\n</style>',
    );
    expect(markdown).toContain('`<style>`');
    expect(css).toBe('h1 { color: red }');
  });
  it('scopes css under the slide tag using nesting', () => {
    expect(scopeCss('h1 { color: red }', 'slide-003')).toBe('slide-003 {\nh1 { color: red }\n}');
    expect(scopeCss('', 'slide-003')).toBe('');
    // rules that cannot be nested stay outside the slide's scope
    expect(
      scopeCss(
        '.spin { animation: spin 2s } @keyframes spin { to { transform: rotate(1turn) } } @import url(x.css);',
        'slide-001',
      ),
    ).toBe(
      '@keyframes spin { to { transform: rotate(1turn) } }\n@import url(x.css);\nslide-001 {\n.spin { animation: spin 2s }  \n}',
    );
  });
});
