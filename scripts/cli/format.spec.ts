import { describe, expect, it, vi } from 'vitest';
import { formatMarkdown } from './format.mjs';

const messy = `---
title:   Messy   deck
layout: cover
---



# Hello


text



---
layout:    center
class: "a"
---
# Two
<!--
a note
-->
`;

describe('formatMarkdown', () => {
  it('tidies spaces, blank lines and frontmatter', async () => {
    const out = await formatMarkdown(messy);
    expect(out).toContain('title: Messy   deck');
    expect(out).toContain('layout: center');
    // Blank lines around the separators are trimmed; blank lines the author put inside a slide stay.
    expect(out).not.toMatch(/\n\n\n---/);
    expect(out).toContain('text\n\n---\nlayout: center');
    expect(out).toContain('# Hello');
    expect(out).toContain('<!--\na note\n-->');
  });
  it('is stable: formatting twice changes nothing more', async () => {
    const once = await formatMarkdown(messy);
    expect(await formatMarkdown(once)).toBe(once);
  });
  it('keeps the slide count and the content', async () => {
    const out = await formatMarkdown(messy);
    expect(out.split('\n---\n').length).toBeGreaterThanOrEqual(2);
    expect(out).toContain('text');
    expect(out).toContain('# Two');
  });
  it('leaves a file without frontmatter alone apart from blank lines', async () => {
    expect(await formatMarkdown('# One\n\n---\n\n# Two\n')).toBe('# One\n\n---\n\n# Two\n');
  });
  it('keeps a last slide written as --- then a heading as one slide', async () => {
    const out = await formatMarkdown('---\ntitle: t\n---\n\n# A\n\n---\n# B\n');
    expect(out.match(/^# /gm)?.length).toBe(2);
    expect(out).not.toMatch(/---\n\n---/);
  });
  it('names the slide and the line of frontmatter that is not valid YAML', async () => {
    const text = '---\ntitle: t\n---\n\n# A\n\n---\nlayout: center\nfoo: a: b\n---\n\n# B\n';
    await expect(formatMarkdown(text, 'talk.md')).rejects.toThrow(
      /^talk\.md:9: the frontmatter of slide 2 is not valid YAML: the value of "foo" has ": " in it, which reads as a second key; put it in quotes: foo: "a: b"; fix it and format again/,
    );
  });
  it('warns about a frontmatter that may have lost its closing ---, and keeps the heading', async () => {
    const text = '---\ntitle: t\n---\n\n# A\n\n---\nlayout: section\n\n# Part 1\n\n---\n\n# B\n';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await formatMarkdown(text, 'talk.md');
    expect(warn.mock.calls[0][0]).toMatch(
      /^talk\.md:10: slide 2: "# Part 1" is in the frontmatter, where it is a YAML comment/,
    );
    expect(out).toContain('# Part 1');
    warn.mockRestore();
  });
  it('formats a frontmatter with a note to self in it, without a warning', async () => {
    const text =
      '---\ntitle: t\n---\n\n# A\n\n---\nlayout: center\n\n# TODO later\n---\n\nreal text\n';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = await formatMarkdown(text, 'talk.md');
    expect(warn).not.toHaveBeenCalled();
    expect(out).toContain('# TODO later');
    warn.mockRestore();
  });
  it('says what is wrong in the words dev and build use', async () => {
    await expect(
      formatMarkdown('---\ntitle: a\ntitle: b\n---\n\n# A\n', 'talk.md'),
    ).rejects.toThrow('talk.md:3: the headmatter is not valid YAML: "title" is set twice');
  });
});
