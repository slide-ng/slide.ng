import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTargets, checkDistinctOutputs, checkExportFlags, deckEntries } from './entries.mjs';

describe('deckEntries', () => {
  it('resolves every entry, and uses slides.md when there is none', () => {
    expect(deckEntries([])).toEqual([resolve('slides.md')]);
    expect(deckEntries(['a.md', 'b/c.md'])).toEqual([resolve('a.md'), resolve('b/c.md')]);
  });
});

describe('buildTargets', () => {
  const out = resolve('dist');
  it('keeps --out and --base for one deck', () => {
    expect(buildTargets([resolve('talk.md')], { out, base: '/x/' })).toEqual([
      { entry: resolve('talk.md'), out, base: '/x/' },
    ]);
  });
  it('gives several decks a folder and a base each, named after the file', () => {
    const targets = buildTargets([resolve('a.md'), resolve('sub/b.md')], { out, base: '/' });
    expect(targets.map((t) => [t.out, t.base])).toEqual([
      [join(out, 'a'), '/a/'],
      [join(out, 'b'), '/b/'],
    ]);
    expect(buildTargets([resolve('a.md'), resolve('b.md')], { out, base: '/talks/' })[1].base).toBe(
      '/talks/b/',
    );
  });
  it('keeps ./ for offline folders', () => {
    const targets = buildTargets([resolve('a.md'), resolve('b.md')], {
      out,
      base: './',
      offline: true,
    });
    expect(targets.map((t) => t.base)).toEqual(['./', './']);
  });
  it('refuses two decks with the same name and names that cannot be in an address', () => {
    expect(() => buildTargets([resolve('x/a.md'), resolve('y/a.md')], { out, base: '/' })).toThrow(
      'would both be built into',
    );
    expect(() =>
      buildTargets([resolve('a.md'), resolve('my talk.md')], { out, base: '/' }),
    ).toThrow('cannot be a folder name');
  });
});

describe('export checks', () => {
  it('refuses --output, --dist and --url with several entries only', () => {
    expect(() => checkExportFlags(['a'], { output: 'x' })).not.toThrow();
    for (const flag of ['output', 'dist', 'url'])
      expect(() => checkExportFlags(['a', 'b'], { [flag]: 'x' })).toThrow(`--${flag}`);
    expect(() => checkExportFlags(['a', 'b'], { format: 'png' })).not.toThrow();
  });
  it('refuses two decks that would write the same file', () => {
    expect(() => checkDistinctOutputs(['a', 'b'], ['/o/x', '/o/y'])).not.toThrow();
    expect(() => checkDistinctOutputs(['a', 'b'], ['/o/x', '/o/x'])).toThrow(
      'would both be exported',
    );
  });
});
