import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDeck } from './parse-deck.mjs';

// Parse a deck that lives only in memory (no src: imports).
const parse = (md: string) => parseDeck('/deck/slides.md', { '/deck/slides.md': md });

const deck = `---
title: My deck
theme: default
---

# One

---
layout: center
class: text-red-500
unknownKey: 42
---

# Two

Some text

<!-- speaker note -->

---

# Three
`;

describe('parseDeck', async () => {
  const { headmatter, slides } = await parse(deck);

  it('splits slides at --- separators', () => {
    expect(slides.length).toBe(3);
    expect(slides.map((s) => s.title)).toEqual(['My deck', 'Two', 'Three']);
  });
  it('treats the first frontmatter as headmatter', () => {
    expect(headmatter).toMatchObject({ title: 'My deck', theme: 'default' });
  });
  it('carries the frontmatter of each slide, unknown keys included', () => {
    expect(slides[1].frontmatter).toEqual({
      layout: 'center',
      class: 'text-red-500',
      unknownKey: 42,
    });
    expect(slides[2].frontmatter).toEqual({});
  });
  it('takes the last HTML comment as the note and removes it from the content', () => {
    expect(slides[1].note).toBe('speaker note');
    expect(slides[1].content).not.toContain('speaker note');
  });
  it('reads a yaml block at the top of a slide as its frontmatter', async () => {
    const out = await parse(
      '---\ntitle: T\n---\n\n# One\n\n---\n\n```yaml\nlayout: quote\n```\n\n# Two\n',
    );
    expect((out.slides[1].frontmatter as { layout?: string }).layout).toBe('quote');
    expect(out.slides[1].content).not.toContain('layout: quote');
  });
  it('removes slides with hide or disabled', async () => {
    const result = await parse(
      '# A\n\n---\nhide: true\n---\n\n# B\n\n---\ndisabled: true\n---\n\n# C\n\n---\n\n# D\n',
    );
    expect(result.slides.map((s) => s.title)).toEqual(['A', 'D']);
  });
  it('does not split at --- inside a code fence', async () => {
    const result = await parse('# A\n\n```md\n---\nx\n---\n```\n\n---\n\n# B\n');
    expect(result.slides.length).toBe(2);
  });
});

describe('parseDeck: title, level and defaults', () => {
  it('gives the heading level of the title, or the `level` frontmatter', async () => {
    const { slides } = await parse('# A\n\n---\n\n## B\n\n---\nlevel: 3\n---\n\n## C\n');
    expect(slides.map((s) => s.level)).toEqual([1, 2, 3]);
  });
  it('takes the title from the frontmatter before the heading', async () => {
    const { slides } = await parse('# A\n\n---\ntitle: Named\n---\n\n# Heading\n');
    expect(slides[1].title).toBe('Named');
  });
  it('merges headmatter `defaults` under every slide, the slide wins', async () => {
    const { slides } = await parse(
      '---\ndefaults:\n  layout: center\n  transition: fade\n---\n\n# A\n\n---\nlayout: quote\n---\n\n# B\n',
    );
    expect(slides[0].frontmatter).toMatchObject({ layout: 'center', transition: 'fade' });
    expect(slides[1].frontmatter).toMatchObject({ layout: 'quote', transition: 'fade' });
  });
  it('takes `level` from the headmatter defaults too', async () => {
    const { slides } = await parse(
      '---\ndefaults:\n  level: 2\n---\n\n# A\n\n---\nlevel: 1\n---\n\n# B\n\n---\n\n# C\n',
    );
    expect(slides.map((s) => s.level)).toEqual([2, 1, 2]);
  });
});

describe('parseDeck: a slide that starts right after ---', () => {
  it('warns when text right after --- was read as frontmatter', async () => {
    const { problems } = await parse('# Z\n\n---\n# Slide A\n\nText\n\n---\n# Slide B\n');
    expect(problems.join()).toContain('were read as frontmatter');
  });
  it('does not warn for a commented-out key', async () => {
    const { problems } = await parse('# Z\n\n---\n# layout: center\n---\n\n# A\n');
    expect(problems).toEqual([]);
  });
  it('does not warn for a comment in frontmatter that has keys', async () => {
    const { problems } = await parse(
      "# Z\n\n---\n# You can also start simply with 'default'\nlayout: center\n---\n\n# A\n",
    );
    expect(problems).toEqual([]);
  });
  it('drops the --- of a last slide written without a blank line', async () => {
    const { slides } = await parse('# A\n\n---\n# B\n');
    expect(slides.at(-1)!.content).toBe('# B');
  });
});

describe('parseDeck: src imports', () => {
  // A real folder, because the parser checks that imported files exist.
  const dir = mkdtempSync(join(tmpdir(), 'slideng-'));
  mkdirSync(join(dir, 'pages'));
  writeFileSync(
    join(dir, 'pages', 'extra.md'),
    '# Extra one\n\n---\nlayout: center\nclass: from-page\n---\n\n# Extra two\n\n---\n\n# Extra three\n',
  );
  const main = (src: string) => {
    writeFileSync(
      join(dir, 'slides.md'),
      `# First\n\n---\nsrc: ${src}\nclass: from-main\n---\n\nignored text\n\n---\n\n# Last\n`,
    );
    return parseDeck(join(dir, 'slides.md'));
  };

  it('takes the title set on the importing slide', async () => {
    writeFileSync(join(dir, 'pages', 'titled.md'), '---\ntitle: Part one\n---\n\n# Heading\n');
    writeFileSync(
      join(dir, 'slides.md'),
      '# First\n\n---\nsrc: ./pages/titled.md\ntitle: Part one again\n---\n',
    );
    const { slides } = await parseDeck(join(dir, 'slides.md'));
    expect(slides[1].title).toBe('Part one again');
  });
  it('replaces the slide by the slides of the imported file', async () => {
    const { slides, files } = await main('./pages/extra.md');
    expect(slides.map((s) => s.title)).toEqual([
      'First',
      'Extra one',
      'Extra two',
      'Extra three',
      'Last',
    ]);
    expect(files.length).toBe(2);
  });
  it('lets the importing slide win when frontmatter keys clash', async () => {
    const { slides } = await main('./pages/extra.md');
    expect(slides[2].frontmatter).toMatchObject({ layout: 'center', class: 'from-main' });
    expect((slides[2].frontmatter as Record<string, unknown>)['src']).toBeUndefined();
  });
  it('imports a range of slides after #', async () => {
    const { slides } = await main('./pages/extra.md#2-3');
    expect(slides.map((s) => s.title)).toEqual(['First', 'Extra two', 'Extra three', 'Last']);
  });
  it('reports a missing file as a problem and keeps going', async () => {
    const { slides, problems } = await main('./pages/nope.md');
    expect(slides.map((s) => s.title)).toEqual(['First', 'Last']);
    expect(problems.join()).toContain('not found');
  });
});

describe('parseDeck: imports outside the deck folder', () => {
  const base = mkdtempSync(join(tmpdir(), 'slideng-out-'));
  const dir = join(base, 'deck');
  mkdirSync(dir);
  writeFileSync(join(base, 'outside.md'), '# Outside one\n');
  symlinkSync(join(base, 'outside.md'), join(dir, 'linked.md'));
  const deck = (src: string, head = '') => {
    writeFileSync(
      join(dir, 'slides.md'),
      `---\n${head}title: T\n---\n\n# First\n\n---\nsrc: ${src}\n---\n\n---\n\n# Last\n`,
    );
    return parseDeck(join(dir, 'slides.md'));
  };

  it('refuses src: ../ with a clear error naming the opt-in', async () => {
    await expect(deck('../outside.md')).rejects.toThrow('allowOutsideRoot: true');
  });
  it('refuses a symlinked markdown file that leads out', async () => {
    await expect(deck('./linked.md')).rejects.toThrow('outside the deck');
  });
  it('reads a leading slash as the deck folder (Slidev), never as a file system path', async () => {
    const { slides, problems } = await deck('/etc/passwd');
    expect(slides.map((s) => s.title)).toEqual(['T', 'Last']);
    expect(problems.join()).toContain(join(dir, 'etc/passwd'));
  });
  it('reads outside files when the deck itself sets allowOutsideRoot: true', async () => {
    const { slides } = await deck('../outside.md', 'allowOutsideRoot: true\n');
    expect(slides.map((s) => s.title)).toEqual(['T', 'Outside one', 'Last']);
  });
});

describe('parseDeck: broken YAML', () => {
  it("stops at a slide's broken frontmatter with the file, line and slide", async () => {
    await expect(
      parse('---\ntitle: ok\n---\n\n# One\n\n---\nclass: "unterminated\n---\n\n# Two\n'),
    ).rejects.toThrow('/deck/slides.md:8: the frontmatter of slide 2 is not valid YAML');
  });
  it('gives the line of a broken headmatter in the file', async () => {
    await expect(parse('---\ntitle: ok\nfoo: [unclosed\n---\n\n# One\n')).rejects.toThrow(
      '/deck/slides.md:3: the headmatter is not valid YAML',
    );
  });
});
