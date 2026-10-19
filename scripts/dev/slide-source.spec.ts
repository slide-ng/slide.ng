import { parse } from '@slidev/parser/core';
import { dragEdit, noteOf, replaceNote, replaceSource, sourceOf } from './slide-source.mjs';

const md = `---
title: T
---

# One

<img slide-ng-drag="[1,2,3,4]">

---
layout: center
dragPos:
  a: 1,2,3,4
---

# Two

<div slide-ng-drag="a">named</div>

<!-- note -->

---

# Three

<slide-ng-drag pos="5,6,7,8">x</slide-ng-drag>
`;
// The line ranges come from the real parser, so these tests also check that we read its numbers right.
let slides: { start: number; contentStart: number; end: number; content: string }[];
beforeAll(async () => {
  const data = await parse(md, '/x/slides.md');
  slides = data.slides.map((s) => ({
    start: s.start,
    contentStart: s.contentStart,
    end: s.end,
    content: s.content,
  }));
});

describe('dragEdit', () => {
  it('writes an inline position into the tag and nothing else', () => {
    const r = dragEdit(md, slides[0], 0, '10,20,30,_');
    expect(r.text).toBe(md.replace('[1,2,3,4]', '[10,20,30,NaN]'));
  });
  it('writes into a component', () => {
    expect(dragEdit(md, slides[2], 0, '9,9,9,9').text).toBe(
      md.replace('pos="5,6,7,8"', 'pos="9,9,9,9"'),
    );
  });
  it('writes a named position into the frontmatter, keeping the rest', () => {
    const r = dragEdit(md, slides[1], 0, '[7,8,9,10]');
    expect(r.text).toBe(md.replace('a: 1,2,3,4', 'a: 7,8,9,10'));
  });
  it('adds dragPos to a slide that has a frontmatter block without it', () => {
    const text = '---\nlayout: center\n---\n\n<div slide-ng-drag="b">x</div>\n';
    const slide = { start: 0, contentStart: 3, end: 6, content: '<div slide-ng-drag="b">x</div>' };
    expect(dragEdit(text, slide, 0, '1,2,3,4').text).toBe(
      '---\nlayout: center\ndragPos:\n  b: 1,2,3,4\n---\n\n<div slide-ng-drag="b">x</div>\n',
    );
  });
  it('adds a block to a slide that has none', () => {
    const text = '# A\n\n---\n\n<div slide-ng-drag="b">x</div>\n';
    const slide = { start: 3, contentStart: 3, end: 6, content: '<div slide-ng-drag="b">x</div>' };
    expect(dragEdit(text, slide, 0, '1,2,3,4').text).toBe(
      '# A\n\n---\ndragPos:\n  b: 1,2,3,4\n---\n\n<div slide-ng-drag="b">x</div>\n',
    );
  });
  it('keeps Windows line endings', () => {
    const r = dragEdit(md.replace(/\n/g, '\r\n'), slides[0], 0, '1,1,1,1');
    expect(r.text).toBe(md.replace('[1,2,3,4]', '[1,1,1,1]').replace(/\n/g, '\r\n'));
  });
  it('refuses a missing site and a position that is not numbers', () => {
    expect(dragEdit(md, slides[0], 5, '1,2,3,4').error).toBeTruthy();
    expect(dragEdit(md, slides[0], 0, '"><script>').error).toBeTruthy();
  });
  it('refuses when the slide text is not where the parser says', () => {
    expect(
      dragEdit(
        'something else entirely\n',
        { start: 0, contentStart: 0, end: 1, content: slides[0].content },
        0,
        '1,2,3,4',
      ).error,
    ).toBeTruthy();
  });
  it('refuses broken frontmatter', () => {
    const text = '---\na: [1\n---\n\n<div slide-ng-drag="b">x</div>\n';
    expect(
      dragEdit(
        text,
        { start: 0, contentStart: 3, end: 6, content: '<div slide-ng-drag="b">x</div>' },
        0,
        '1,2,3,4',
      ).error,
    ).toMatch(/YAML/);
  });
});

describe('sourceOf and replaceSource', () => {
  it('reads and replaces the lines of one slide', () => {
    expect(sourceOf(md, slides[1]).split('\n')[0]).toBe('---');
    expect(sourceOf(md, slides[1])).toContain('<!-- note -->');
    const r = replaceSource(
      md,
      slides[2],
      sourceOf(md, slides[2]).replace('<slide-ng-drag pos="5,6,7,8">x</slide-ng-drag>', 'changed'),
    );
    expect(r.text).toBe(md.replace('<slide-ng-drag pos="5,6,7,8">x</slide-ng-drag>', 'changed'));
  });
  it('keeps a blank line under the separator of a slide that has no frontmatter, so its text is not read as frontmatter', () => {
    const r = replaceSource(md, slides[2], '# Three, edited');
    expect(r.text).toContain('---\n\n# Three, edited');
  });
  it('lets a slide without frontmatter gain one, and one with frontmatter lose it, still one slide each', async () => {
    const gained = replaceSource(
      md,
      slides[2],
      '---\nlayout: center\n---\n\n# Three, centred',
    ).text;
    const g = await parse(gained, '/x/slides.md');
    expect(g.slides.length).toBe(3);
    expect(g.slides[2].frontmatter).toEqual({ layout: 'center' });
    const lost = replaceSource(md, slides[1], '# Two, plain').text;
    const l = await parse(lost, '/x/slides.md');
    expect(l.slides.length).toBe(3);
    expect(l.slides[1].frontmatter).toEqual({});
    expect(l.slides[1].content.trim()).toBe('# Two, plain');
  });
  it('keeps a blank line before the next slide', () => {
    expect(replaceSource(md, slides[0], '---\ntitle: T\n---\n\n# One!').text).toContain(
      '# One!\n\n---',
    );
  });
  it('can make a slide longer or shorter without touching the others', () => {
    const r = replaceSource(md, slides[0], '# One');
    expect(r.text.startsWith('# One\n')).toBe(true);
    expect(r.text).toContain('# Two');
  });
});

describe('noteOf and replaceNote', () => {
  it('reads the last comment as the note only when it ends the slide', () => {
    expect(noteOf('# A\n\n<!-- one -->\n\ntext\n\n<!--\n two \n-->\n')).toBe('two');
    expect(noteOf('# A\n\n<!-- not a note -->\n\ntext\n')).toBe('');
  });
  it('replaces, adds and removes the note, keeping the rest', () => {
    expect(replaceNote('# A\n\ntext\n\n<!-- old -->\n', 'new')).toBe(
      '# A\n\ntext\n\n<!--\nnew\n-->\n',
    );
    expect(replaceNote('# A\n\ntext\n', ' added ')).toBe('# A\n\ntext\n\n<!--\nadded\n-->\n');
    expect(replaceNote('# A\n\n<!-- keep -->\n\ntext\n\n<!-- old -->', '')).toBe(
      '# A\n\n<!-- keep -->\n\ntext',
    );
  });
  it("matches the parser's note", async () => {
    const data = await parse(md, '/x/slides.md');
    const raw = sourceOf(md, data.slides[1]);
    expect(noteOf(raw)).toBe(data.slides[1].note);
    const changed = await parse(md.replace(raw, replaceNote(raw, 'changed')), '/x/slides.md');
    expect(changed.slides.map((s) => s.note)).toEqual([undefined, 'changed', undefined]);
  });
});
