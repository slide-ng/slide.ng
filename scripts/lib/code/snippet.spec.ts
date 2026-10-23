import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SNIPPET_LINE, dedent, findRegion, resolveSnippet } from './snippet.mjs';

const lines = [
  'a',
  '// #region one',
  '  x',
  '  // #region inner',
  '    y',
  '  // #endregion inner',
  '// #endregion one',
  'b',
];

describe('snippet lines', () => {
  it('splits file, region, language and the rest', () => {
    const m = SNIPPET_LINE.exec('<<< @/snippets/a.ts#part ts {2|3}{lines:true}')!;
    expect(m.slice(1)).toEqual(['@/snippets/a.ts', '#part', 'ts', undefined, '{2|3}{lines:true}']);
  });
  it('reads a title after the language, with spaces and an icon', () => {
    const parts = (line: string) => SNIPPET_LINE.exec(line)!.slice(1);
    expect(parts('<<< ./a.py python [a.py]')).toEqual([
      './a.py',
      undefined,
      'python',
      '[a.py]',
      undefined,
    ]);
    expect(parts('<<< ./a.ts ts{1}')).toEqual(['./a.ts', undefined, 'ts', undefined, '{1}']);
    expect(parts('<<< ./a.py [a.py]')).toEqual([
      './a.py',
      undefined,
      undefined,
      '[a.py]',
      undefined,
    ]);
    expect(parts('<<< ./a.py#x [title with space] {2}')).toEqual([
      './a.py',
      '#x',
      undefined,
      '[title with space]',
      '{2}',
    ]);
    expect(parts('<<< @/a.ts ts [npm ~i-carbon:terminal~]{1|2}{lines:true}')).toEqual([
      '@/a.ts',
      undefined,
      'ts',
      '[npm ~i-carbon:terminal~]',
      '{1|2}{lines:true}',
    ]);
  });
  it('does not take the ranges for a language', () => {
    expect(SNIPPET_LINE.exec('<<< ./a.ts {*}{lines:true}')![3]).toBeUndefined();
  });
});

describe('regions', () => {
  it('finds the lines between the markers', () => {
    expect(findRegion(lines, 'one')).toEqual([
      '  x',
      '  // #region inner',
      '    y',
      '  // #endregion inner',
    ]);
  });
  it('finds an inner region', () => {
    expect(findRegion(lines, 'inner')).toEqual(['    y']);
  });
  it('returns null for an unknown region', () => {
    expect(findRegion(lines, 'nope')).toBeNull();
  });
  it('dedents by the smallest indent', () => {
    expect(dedent(['    a', '      b', ''])).toEqual(['a', '  b', '']);
  });
});

describe('resolveSnippet', () => {
  const root = mkdtempSync(join(tmpdir(), 'snip-'));
  writeFileSync(join(root, 'a.ts'), 'one\n// #region r\n  two\n// #endregion r\n');
  it('reads a file relative to the slide, language from the extension', () => {
    expect(resolveSnippet('<<< ./a.ts', join(root, 'slides.md'), root)).toMatchObject({
      code: 'one\n// #region r\n  two\n// #endregion r',
      lang: 'ts',
    });
  });
  it('reads `@/` from the project root and cuts a region', () => {
    expect(resolveSnippet('<<< @/a.ts#r js', '/elsewhere/slides.md', root)).toMatchObject({
      code: 'two',
      lang: 'js',
    });
  });
  it('keeps the title and the options after the language', () => {
    expect(
      resolveSnippet('<<< ./a.ts#r js [a b ~i-carbon:code~] {1}', join(root, 'slides.md'), root),
    ).toMatchObject({
      code: 'two',
      lang: 'js',
      meta: '[a b ~i-carbon:code~] {1}',
    });
    expect(resolveSnippet('<<< ./a.ts [a.ts]', join(root, 'slides.md'), root)).toMatchObject({
      lang: 'ts',
      meta: '[a.ts]',
    });
  });
  it('refuses a file outside the deck folder: absolute, ../ and @/../ (a clear error)', () => {
    const deck = mkdtempSync(join(tmpdir(), 'snip-deck-'));
    for (const line of [
      `<<< ${join(root, 'a.ts')}`,
      '<<< ../a.ts',
      '<<< @/../a.ts',
      '<<< /etc/passwd',
    ])
      expect(() => resolveSnippet(line, join(deck, 'slides.md'), deck), line).toThrow(
        'outside the deck',
      );
  });
  it('refuses a symlink inside the deck that leads out', () => {
    const deck = mkdtempSync(join(tmpdir(), 'snip-deck-'));
    symlinkSync(join(root, 'a.ts'), join(deck, 'link.ts'));
    expect(() => resolveSnippet('<<< ./link.ts', join(deck, 'slides.md'), deck)).toThrow(
      'outside the deck',
    );
  });
  it('reads outside the deck only with the explicit opt-in, or from a listed theme folder', () => {
    const deck = mkdtempSync(join(tmpdir(), 'snip-deck-'));
    const line = `<<< ${join(root, 'a.ts')}`;
    expect(
      resolveSnippet(line, join(deck, 'slides.md'), deck, { allowOutsideRoot: true })!.code,
    ).toContain('one');
    expect(
      resolveSnippet(line, join(deck, 'slides.md'), deck, { roots: [deck, root] })!.code,
    ).toContain('one');
  });
  it('throws a readable error for a missing file', () => {
    expect(() => resolveSnippet('<<< ./missing.ts', join(root, 'slides.md'), root)).toThrow(
      'Code snippet not found',
    );
  });
  it('says that a path in an imported file starts at that file, and suggests @/', () => {
    mkdirSync(join(root, 'snips'), { recursive: true });
    writeFileSync(join(root, 'snips/here.ts'), 'const a = 1;\n');
    const inPart = join(root, 'parts/x.md');
    expect(() => resolveSnippet('<<< ./snips/here.ts', inPart, root)).toThrow(
      "(a path is relative to the file the <<< is in; for the deck's snips/here.ts write <<< @/snips/here.ts)",
    );
    expect(() => resolveSnippet('<<< ./snips/gone.ts', inPart, root)).toThrow(
      "@/ starts at the deck's folder",
    );
  });
});
