import { describe, expect, it } from 'vitest';
import { notesToText, textToNotes } from './notes-text';

describe('notes text', () => {
  it('writes every note after its marker and reads them back', () => {
    const text = notesToText(['First note.', '', 'Line one\n\nLine two']);
    expect(text).toBe('--- #1\n\nFirst note.\n\n--- #2\n\n--- #3\n\nLine one\n\nLine two\n');
    expect(textToNotes(text, 3)).toEqual(['First note.', '', 'Line one\n\nLine two']);
  });

  it('refuses a text whose markers changed', () => {
    const text = notesToText(['a', 'b']);
    expect(textToNotes(text.replace('--- #2', 'b2'), 2)).toHaveProperty('error');
    expect(textToNotes(text.replace('--- #2', '--- #3'), 2)).toHaveProperty('error');
    expect(textToNotes(`stray\n${text}`, 2)).toHaveProperty('error');
    expect(textToNotes(`${text}\n--- #3\n`, 2)).toHaveProperty('error');
  });

  it('keeps a markdown rule that is not a marker inside a note', () => {
    expect(textToNotes('--- #1\n\nabove\n\n---\n\nbelow\n', 1)).toEqual(['above\n\n---\n\nbelow']);
  });
});
