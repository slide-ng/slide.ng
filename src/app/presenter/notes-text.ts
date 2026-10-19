// The text of the notes editor (/notes-edit): every note in one text, each after a `--- #N` line, as in Slidev.

/** All notes as one text. */
export const notesToText = (notes: string[]): string =>
  notes.map((note, i) => `--- #${i + 1}\n${note ? `\n${note}\n` : ''}`).join('\n');

/**
 * The notes of the text, or the reason it cannot be saved: the `--- #N` lines must stay as they are (one per slide, in order),
 * so that every note lands on its own slide.
 */
export function textToNotes(text: string, total: number): string[] | { error: string } {
  const parts = text.replace(/\r\n/g, '\n').split(/^--- #(\d+)[ \t]*$/m);
  const markers = parts.filter((_, i) => i % 2 === 1).map(Number);
  if (parts[0].trim() || markers.length !== total || markers.some((n, i) => n !== i + 1))
    return { error: `Keep the ${total} "--- #N" lines as they are, one per slide, in order.` };
  return parts.filter((_, i) => i > 0 && i % 2 === 0).map((note) => note.trim());
}
