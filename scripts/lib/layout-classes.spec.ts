// The 21 layouts against Slidev (packages/client/layouts/*.vue, and the default theme's six: cover, fact, intro, quote, section, statement).
// For each layout: the classes of its root element, and of the box inside it (`my-auto ...`), as Slidev writes them.
// `block` is the only extra we allow: our layouts are custom elements, which are inline until told otherwise.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SLIDEV: Record<string, { root: string; inner?: string }> = {
  '404': { root: 'px-4 py-10 text-center text-teal-700 dark:text-gray-200' },
  center: { root: 'slidev-layout center h-full grid place-content-center', inner: 'my-auto' },
  cover: { root: 'slidev-layout cover', inner: 'my-auto w-full' },
  default: { root: 'slidev-layout default' },
  end: { root: 'slidev-layout end' },
  error: { root: 'px-4 py-10 text-center text-red-700 dark:text-red-500 font-bold font-mono' },
  fact: { root: 'slidev-layout fact', inner: 'my-auto' },
  full: { root: 'slidev-layout full w-full h-full' },
  'iframe-left': { root: 'grid grid-cols-2 w-full h-full' },
  'iframe-right': { root: 'grid grid-cols-2 w-full h-full' },
  iframe: { root: 'h-full w-full' },
  'image-left': { root: 'grid grid-cols-2 w-full h-full auto-rows-fr' },
  'image-right': { root: 'grid grid-cols-2 w-full h-full auto-rows-fr' },
  image: { root: 'slidev-layout w-full h-full' },
  intro: { root: 'slidev-layout intro', inner: 'my-auto' },
  none: { root: '' },
  quote: { root: 'slidev-layout quote', inner: 'my-auto' },
  section: { root: 'slidev-layout section w-full h-full grid', inner: 'my-auto text-center' },
  statement: { root: 'slidev-layout statement', inner: 'my-auto' },
  'two-cols-header': { root: 'slidev-layout two-cols-header w-full h-full' },
  'two-cols': { root: 'slidev-layout two-columns w-full h-full grid grid-cols-2' },
};

const tokens = (text: string) =>
  text
    .split(/\s+/)
    .filter((t) => t && t !== 'block')
    .sort();
const source = (name: string) =>
  readFileSync(join(process.cwd(), 'src/app/layouts', `${name}.ts`), 'utf8');
const template = (name: string) =>
  readFileSync(join(process.cwd(), 'src/app/layouts', `${name}.html`), 'utf8');

describe('layouts against Slidev', () => {
  it('lists all 21 layouts', () => expect(Object.keys(SLIDEV)).toHaveLength(21));

  for (const [name, expected] of Object.entries(SLIDEV)) {
    it(`${name}: the classes of the root element are Slidev's`, () => {
      const host = /host:\s*\{\s*class:\s*'([^']*)'/.exec(source(name));
      expect(tokens(host?.[1] ?? '')).toEqual(tokens(expected.root));
    });
    if (expected.inner) {
      it(`${name}: the box inside has Slidev's classes`, () => {
        const inner = /^<div class="([^"]*)">/.exec(template(name));
        expect(tokens(inner?.[1] ?? '')).toEqual(tokens(expected.inner!));
      });
    }
  }

  it('the content boxes of the image and iframe layouts are the default layout', () => {
    for (const name of ['image-left', 'image-right', 'iframe-left', 'iframe-right'])
      expect(template(name)).toContain('class="slidev-layout default"');
  });
});

describe('layout styles against Slidev', () => {
  const css = readFileSync(join(process.cwd(), 'src/styles/layouts.css'), 'utf8');
  it('full has no padding rule of its own (Slidev keeps the normal padding)', () => {
    expect(css).not.toMatch(/\.slidev-layout\.full\s*\{[^}]*padding/);
  });
  it('the base layout has Slidev padding and size', () => {
    // Line breaks do not matter, so the check survives a reformat.
    const oneLine = css.replace(/\s+/g, ' ');
    expect(oneLine).toMatch(
      /\.slidev-layout \{[^}]*padding: 2\.5rem 3\.5rem; font-size: 1\.1rem; height: 100%/,
    );
  });
  it('h1 has no bold weight of its own (the reset gives it the normal weight)', () => {
    expect(/\.slidev-layout h1 \{[^}]*\}/.exec(css)?.[0]).not.toContain('font-weight');
  });
});
