import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractFences as extract } from './fences.mjs';

// The generator is plain JS, so the fence list is loosely typed here.
const extractFences = (md: string, ctx?: object) =>
  extract(md, ctx) as { markdown: string; fences: any[] };

describe('extractFences', () => {
  it('replaces a fence by a placeholder and keeps its info and code', () => {
    const { markdown, fences } = extractFences('before\n```ts {1}\nconst a = 1;\n```\nafter');
    expect(markdown).toContain('NGFENCE0X');
    expect(markdown).not.toContain('const a');
    expect(fences).toEqual([{ ticks: 3, info: 'ts {1}', code: 'const a = 1;' }]);
  });
  it('keeps a shorter fence inside a longer one (magic-move)', () => {
    const { fences } = extractFences('````md magic-move\n```js\na\n```\n```js\nb\n```\n````');
    expect(fences).toHaveLength(1);
    expect(fences[0].ticks).toBe(4);
    expect(fences[0].code).toBe('```js\na\n```\n```js\nb\n```');
  });
  it('collects the fences of a ::code-group', () => {
    const { markdown, fences } = extractFences(
      '::code-group\n\n```sh [npm]\na\n```\n\n```sh [yarn]\nb\n```\n\n::\ntext',
    );
    expect(fences).toHaveLength(1);
    expect(fences[0].group.map((f: { info: string }) => f.info)).toEqual(['sh [npm]', 'sh [yarn]']);
    expect(markdown).toContain('text');
  });
  it('does not look for snippets inside a fence', () => {
    const { fences } = extractFences('```md\n<<< ./nope.ts\n```');
    expect(fences[0].code).toBe('<<< ./nope.ts');
  });
  it('turns a snippet line into a fence, and reports a missing file', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fences } = extractFences('<<< ./nope.ts', { file: '/x/slides.md', root: '/x' });
    expect(fences[0].code).toContain('Code snippet not found');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it('stops the build for a snippet outside the deck, unless the deck opts in', () => {
    const ctx = { file: '/x/slides.md', root: '/x' };
    expect(() => extractFences('<<< /etc/hostname', ctx)).toThrow('allowOutsideRoot: true');
    expect(() => extractFences('<<< ../../etc/hostname', ctx)).toThrow('outside the deck');
    const { fences } = extractFences('<<< /etc/hostname', { ...ctx, allowOutsideRoot: true });
    expect(fences[0].code.length).toBeGreaterThan(0);
  });
});

describe('the missing snippet warning', () => {
  it('names the slide and the file and line of the <<<', () => {
    const root = mkdtempSync(join(tmpdir(), 'fences-'));
    mkdirSync(join(root, 'parts'));
    const file = join(root, 'parts', 'a.md');
    writeFileSync(file, '# A\n\ntext\n\n<<< ./nope.ts\n');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    extractFences('# A\n\ntext\n\n<<< ./nope.ts', { file, root, slide: { no: 7 } });
    expect(warn.mock.calls[0][0]).toMatch(
      /^\[slides\] slide 7 \(parts\/a\.md:5\): Code snippet not found/,
    );
    warn.mockRestore();
    rmSync(root, { recursive: true });
  });
  it('names the line in its own slide when an earlier slide has the same snippet line', () => {
    const root = mkdtempSync(join(tmpdir(), 'fences-'));
    const file = join(root, 'slides.md');
    writeFileSync(file, '# A\n\n<<< ./nope.ts\n\n---\n\n# B\n\n<<< ./nope.ts\n');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const source = { filepath: file, contentStart: 5, end: 9 };
    extractFences('# B\n\n<<< ./nope.ts', { file, root, slide: { no: 2, source } });
    expect(warn.mock.calls[0][0]).toMatch(/^\[slides\] slide 2 \(slides\.md:9\): /);
    warn.mockRestore();
    rmSync(root, { recursive: true });
  });
});
