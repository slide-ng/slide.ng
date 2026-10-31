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
  it('keeps the routeAlias of a hidden slide, for the link warning', async () => {
    const result = await parse('# A\n\n---\nhide: true\nrouteAlias: ghost\n---\n\n# B\n');
    expect(result.hiddenAliases).toEqual(['ghost']);
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
  it('does not warn for a note to self after an empty line in a frontmatter', async () => {
    const { problems } = await parse('# Z\n\n---\nlayout: center\n\n# TODO later\n---\n\nText\n');
    expect(problems).toEqual([]);
  });
  it('still warns for a real heading that starts with a note word', async () => {
    const { problems } = await parse(
      '# Z\n\n---\nlayout: section\n\n# Notes from the field\n\n---\n\n# Next\n',
    );
    expect(problems.join()).toContain('"# Notes from the field" is in the frontmatter');
  });
  it('warns when a missing closing --- turns a heading into a YAML comment', async () => {
    const { problems, slides } = await parse(
      '# Z\n\n---\nlayout: section\n\n# Part 1: Basics\n\n---\n\n# Next\n',
    );
    expect(slides).toHaveLength(2);
    expect(problems).toEqual([
      '/deck/slides.md:6: slide 2: "# Part 1: Basics" is in the frontmatter, where it is a YAML comment and is not shown; if it is the slide\'s text, the "---" that ends the frontmatter is missing above it',
    ]);
  });
  it("warns when a last slide's frontmatter has no closing --- and shows as text", async () => {
    const { problems } = await parse('# Z\n\n---\nlayout: end\n');
    expect(problems).toEqual([
      '/deck/slides.md:4: slide 2: "layout: end" is shown as the slide\'s text; to make it frontmatter, end it with a "---" line',
    ]);
    // After an empty line, it is text on purpose.
    expect((await parse('# Z\n\n---\n\nlayout: end\n')).problems).toEqual([]);
  });
  it('names the --- line of the slide', async () => {
    const { problems } = await parse(
      '# Z\n\n---\nlayout: center\n---\n\n# A\n\n---\n# Slide A\n\nText\n\n---\n\n# C\n',
    );
    expect(problems.join()).toContain('slides.md:9: slide 3: the lines after');
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
    const { slides, problems, importProblems, missing } = await main('./pages/nope.md');
    expect(slides.map((s) => s.title)).toEqual(['First', 'Last']);
    expect(problems.join()).toContain('not found');
    // The dev server shows these in its banner and watches for the file to be made.
    expect(importProblems.join()).toContain('not found');
    expect(missing.map((f) => f.replaceAll('\\', '/'))).toEqual([
      expect.stringMatching(/\/pages\/nope\.md$/),
    ]);
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
  it("gives the line of the error in a slide's frontmatter, not the line of its ---", async () => {
    await expect(
      parse('---\ntitle: ok\n---\n\n# One\n\n---\nlayout: center\nfoo:\n\tbar: 1\n---\n\n# Two\n'),
    ).rejects.toThrow(
      '/deck/slides.md:10: the frontmatter of slide 2 is not valid YAML: this line is indented with a tab; YAML needs spaces',
    );
  });
  it('says to quote a value that has ": " in it', async () => {
    await expect(
      parse(
        '---\ntitle: ok\n---\n\n# One\n\n---\nlayout: center\ntitle: Part 2: more\n---\n\n# Two\n',
      ),
    ).rejects.toThrow(
      '/deck/slides.md:9: the frontmatter of slide 2 is not valid YAML: the value of "title" has ": " in it, which reads as a second key; put it in quotes: title: "Part 2: more"',
    );
    await expect(parse('---\ntitle: Intro: the basics\n---\n\n# One\n')).rejects.toThrow(
      '/deck/slides.md:2: the headmatter is not valid YAML: the value of "title" has ": " in it',
    );
  });
  it('points at a missing closing --- when slide text was read as YAML', async () => {
    await expect(
      parse('---\ntitle: ok\ntheme: default\n\n# One\n\nSome text here.\n\n---\n\n# Two\n'),
    ).rejects.toThrow(
      '/deck/slides.md:7: the headmatter is not valid YAML: "Some text here." is not a "key: value" line; if it is the slide\'s text, the --- that ends the headmatter is missing above it',
    );
  });
});

describe('parseDeck: progressBar', () => {
  it('takes true, top, bottom and an object without a word', async () => {
    for (const v of ['true', 'false', 'top', 'bottom', '{ position: top, height: 6 }']) {
      const { problems } = await parse(`---\nprogressBar: ${v}\n---\n\n# A\n`);
      expect(problems).toEqual([]);
    }
  });
  it('warns about a value that draws no bar', async () => {
    for (const v of ['left', '1', '[top]', 'yes']) {
      const { problems } = await parse(`---\nprogressBar: ${v}\n---\n\n# A\n`);
      expect(problems.join()).toContain('progressBar:');
    }
    const { problems } = await parse('---\nprogressBar: { position: left }\n---\n\n# A\n');
    expect(problems.join()).toContain('progressBar.position: "left"');
  });
});

describe('parseDeck: navPosition', () => {
  it('takes the six places', async () => {
    for (const v of [
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'top-left',
      'top-center',
      'top-right',
    ]) {
      const { problems } = await parse(`---\nnavPosition: ${v}\n---\n\n# A\n`);
      expect(problems).toEqual([]);
    }
  });
  it('warns about another value, with the near name', async () => {
    const { problems } = await parse('---\nnavPosition: top-rigth\n---\n\n# A\n');
    expect(problems.join()).toContain('`navPosition: "top-rigth"` is not used');
    expect(problems.join()).toContain('Did you mean "top-right"?');
    for (const v of ['top', 'left', 'true']) {
      const { problems } = await parse(`---\nnavPosition: ${v}\n---\n\n# A\n`);
      expect(problems.join()).toContain('navPosition:');
    }
  });
});

describe('parseDeck: browser', () => {
  it('takes false and { links, tabs } with web addresses', async () => {
    for (const v of [
      'false',
      '{ links: false }',
      '{ tabs: [{ name: Docs, url: "https://angular.dev" }, "https://a.dev"] }',
    ]) {
      const { problems } = await parse(`---\nbrowser: ${v}\n---\n\n# A\n`);
      expect(problems).toEqual([]);
    }
  });
  it('warns about another value, a bad links and a tab that is not a web address', async () => {
    expect((await parse('---\nbrowser: yes please\n---\n\n# A\n')).problems.join()).toContain(
      '`browser: "yes please"` is not used',
    );
    expect(
      (await parse('---\nbrowser: { search: "https://s.dev/" }\n---\n\n# A\n')).problems.join(),
    ).toContain('browser.search');
    expect((await parse('---\nbrowser: { links: maybe }\n---\n\n# A\n')).problems.join()).toContain(
      'browser.links',
    );
    expect(
      (
        await parse('---\nbrowser: { tabs: [{ url: "javascript:x" }] }\n---\n\n# A\n')
      ).problems.join(),
    ).toContain('is left out');
  });
});

describe('a translation (options.base)', () => {
  it("puts the file's own headmatter over the base and keeps it as written", async () => {
    const d = await parseDeck(
      '/deck/slides.tr.md',
      { '/deck/slides.tr.md': '---\ntitle: Bir\n---\n\n# Bir\n' },
      { base: { title: 'One', colorSchema: 'dark', allowOutsideRoot: true } },
    );
    expect(d.headmatter).toMatchObject({ title: 'Bir', colorSchema: 'dark' });
    expect(d.ownHeadmatter).toEqual({ title: 'Bir' });
    expect(d.allowOutsideRoot).toBe(true);
  });
  it('takes allowOutsideRoot from the base only, and checks only its own keys', async () => {
    const d = await parseDeck(
      '/deck/slides.tr.md',
      { '/deck/slides.tr.md': '---\nallowOutsideRoot: true\n---\n\n# Bir\n' },
      { base: { highlighter: 'prism' } },
    );
    expect(d.allowOutsideRoot).toBe(false);
    expect(d.problems).toEqual([]);
  });
});

describe('parseDeck: the config file', () => {
  const CONFIG = '/deck/slide-ng.config.yaml';
  const withConfig = (config: string, md = '# One\n') =>
    parseDeck('/deck/slides.md', { '/deck/slides.md': md, [CONFIG]: config });

  it('takes the headmatter keys from the config file', async () => {
    const d = await withConfig(
      'title: From config\ncolorSchema: dark\ndefaults:\n  layout: center\n',
    );
    expect(d.headmatter).toMatchObject({ title: 'From config', colorSchema: 'dark' });
    expect(d.ownHeadmatter).toEqual({
      title: 'From config',
      colorSchema: 'dark',
      defaults: { layout: 'center' },
    });
    expect(d.slides[0].frontmatter).toMatchObject({ layout: 'center' });
    expect(d.config).toEqual({ file: CONFIG, lines: expect.objectContaining({ title: 1 }) });
  });
  it('lets the headmatter win key by key, merging fonts, themeConfig and defaults', async () => {
    const d = await withConfig(
      'title: Config\nlang: tr\nfonts: { sans: Inter, mono: Fira Code }\nthemeConfig: { primary: red }\ndefaults: { layout: center }\nseoMeta: { ogTitle: A, ogDescription: B }\n',
      '---\ntitle: Headmatter\nfonts: { mono: JetBrains Mono }\nthemeConfig: { accent: blue }\ndefaults: { class: big }\nseoMeta: { ogTitle: C }\n---\n\n# One\n',
    );
    expect(d.headmatter).toMatchObject({
      title: 'Headmatter',
      lang: 'tr',
      fonts: { sans: 'Inter', mono: 'JetBrains Mono' },
      themeConfig: { primary: 'red', accent: 'blue' },
      defaults: { layout: 'center', class: 'big' },
      seoMeta: { ogTitle: 'C' },
    });
  });
  it('changes nothing for a deck without one', async () => {
    const d = await parse('---\ntitle: T\n---\n\n# One\n');
    expect(d.ownHeadmatter).toEqual({ title: 'T' });
    expect(d.config).toBeNull();
  });
  it('names the config file and line in a warning about its key, the entry file for its own', async () => {
    const d = await withConfig('title: T\nnavPosition: top-lft\nhighlighter: prism\n');
    expect(d.problems).toEqual([
      expect.stringMatching(
        /^\/deck\/slide-ng\.config\.yaml:2: `navPosition: "top-lft"` is not used/,
      ),
      expect.stringMatching(/^\/deck\/slide-ng\.config\.yaml:3: `highlighter: prism` is not used/),
    ]);
    const over = await withConfig('navPosition: top-lft\n', '---\nnavPosition: top-rigt\n---\n');
    expect(over.problems).toEqual([
      expect.stringMatching(/^\/deck\/slides\.md: `navPosition: "top-rigt"` is not used/),
    ]);
  });
  it('passes on the warnings of the config file itself', async () => {
    const d = await withConfig('layout: center\n');
    expect(d.problems).toEqual([
      expect.stringContaining(`${CONFIG}:1: \`layout\` belongs to the first slide`),
    ]);
  });
  it('stops the build at a config file that is not valid YAML', async () => {
    await expect(withConfig('title: [x\n')).rejects.toThrow(
      `${CONFIG}:1: the config file is not valid YAML`,
    );
  });
  it('is not read for a translation, which has it in its base', async () => {
    const d = await parseDeck(
      '/deck/slides.tr.md',
      { '/deck/slides.tr.md': '---\ntitle: Bir\n---\n\n# Bir\n', [CONFIG]: 'colorSchema: dark\n' },
      { base: { title: 'One' } },
    );
    expect(d.headmatter.colorSchema).toBeUndefined();
    expect(d.config).toBeNull();
  });
});

describe('parseDeck: allowOutsideRoot in the config file', () => {
  const base = mkdtempSync(join(tmpdir(), 'slideng-config-out-'));
  const dir = join(base, 'deck');
  mkdirSync(dir);
  writeFileSync(join(base, 'outside.md'), '# Outside one\n');
  writeFileSync(
    join(dir, 'slides.md'),
    '---\ntitle: T\n---\n\n# First\n\n---\nsrc: ../outside.md\n---\n',
  );

  it('refuses an import outside the deck without it', async () => {
    await expect(parseDeck(join(dir, 'slides.md'))).rejects.toThrow('allowOutsideRoot: true');
  });
  it('allows it as the headmatter does', async () => {
    writeFileSync(join(dir, 'slide-ng.config.yaml'), 'allowOutsideRoot: true\n');
    const d = await parseDeck(join(dir, 'slides.md'));
    expect(d.allowOutsideRoot).toBe(true);
    expect(d.slides.map((s) => s.title)).toEqual(['T', 'Outside one']);
  });
  it('lets the headmatter turn it off again', async () => {
    writeFileSync(
      join(dir, 'slides.md'),
      '---\nallowOutsideRoot: false\n---\n\n# First\n\n---\nsrc: ../outside.md\n---\n',
    );
    await expect(parseDeck(join(dir, 'slides.md'))).rejects.toThrow('allowOutsideRoot: true');
  });
});
