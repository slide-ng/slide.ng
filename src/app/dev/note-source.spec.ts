import { describe, expect, it } from 'vitest';
import { noteOf, withNote } from './note-source';

const slide =
  '---\nlayout: center\n---\n\n# Title\n\nText.\n\n<!--\nOld note.\n[click] Two.\n-->\n';

describe('noteOf', () => {
  it('reads the last comment at the end of the slide', () => {
    expect(noteOf(slide)).toBe('Old note.\n[click] Two.');
  });
  it('is empty when the last comment is followed by content, or there is none', () => {
    expect(noteOf('# A\n\n<!-- not a note -->\n\nMore text.\n')).toBe('');
    expect(noteOf('# A\n')).toBe('');
  });
  it('does not start a note inside the frontmatter', () => {
    expect(noteOf('---\ntitle: Use <!-- for notes\n---\n\n# Two\n\nBody\n\n<!-- hi -->')).toBe(
      'hi',
    );
    expect(noteOf('---\ntitle: <!-- a -->\n---\n\n# Two\n')).toBe('');
    expect(noteOf('\n```yaml\ntitle: <!-- a\n```\n\n# Two\n\n<!-- hi -->\n')).toBe('hi');
  });
});

describe('withNote', () => {
  it('replaces only the note', () => {
    expect(withNote(slide, 'New note.')).toBe(
      '---\nlayout: center\n---\n\n# Title\n\nText.\n\n<!--\nNew note.\n-->\n',
    );
  });
  it('adds a note to a slide without one', () => {
    expect(withNote('\n# A\n\nText.\n', 'Hello')).toBe('\n# A\n\nText.\n\n<!--\nHello\n-->\n');
    expect(withNote('# A', 'Hello')).toBe('# A\n\n<!--\nHello\n-->');
  });
  it('removes the comment when the note is emptied', () => {
    expect(withNote(slide, '  ')).toBe('---\nlayout: center\n---\n\n# Title\n\nText.\n');
    expect(withNote('# A\n', '')).toBe('# A\n');
  });
  it('keeps an inner comment that is not the note', () => {
    const raw = '# A\n\n<!-- inner -->\n\nText.\n';
    expect(withNote(raw, 'N')).toBe('# A\n\n<!-- inner -->\n\nText.\n\n<!--\nN\n-->\n');
  });
  it('cannot end the comment early', () => {
    const raw = withNote('# A\n', 'a --> b');
    expect(noteOf(raw)).toBe('a -- > b');
    expect(raw.match(/-->/g)).toHaveLength(1);
  });
  it('leaves a comment opener in the frontmatter alone', () => {
    const raw = '---\ntitle: Use <!-- for notes\n---\n\n# Two\n\nBody\n\n<!-- hi -->';
    expect(withNote(raw, 'New')).toBe(
      '---\ntitle: Use <!-- for notes\n---\n\n# Two\n\nBody\n\n<!--\nNew\n-->',
    );
    expect(withNote(raw, '')).toBe('---\ntitle: Use <!-- for notes\n---\n\n# Two\n\nBody');
    const tail = '---\ntitle: <!-- a -->\n---\n\n# Two\n';
    expect(withNote(tail, 'N')).toBe(`${tail}\n<!--\nN\n-->\n`);
  });
  it('reads and writes the same note back', () => {
    expect(withNote(slide, noteOf(slide))).toBe(slide);
  });
});
