// Speaker notes -> HTML for the presenter page. `[click]` markers (at the start of a line or
// list item) become spans that the browser uses to highlight the part for the current click:
//   [click]    the next click       [click:3]  skip two clicks (same rule as Slidev's click markers)
import { Marked } from 'marked';
import { linkRenderer } from './links.mjs';

// A link to a web page opens a new tab, so the presenter view stays. A link to a slide stays a plain link: the notes are
// shown as HTML, where <slide-ng-link> would do nothing.
const marked = new Marked({ renderer: linkRenderer({ slides: false }) });

/** @param {string | null | undefined} note @returns {string | null} */
export function noteToHtml(note) {
  if (!note || !note.trim()) return null;
  let clicks = 0;
  const withMarks = note.replace(/\[click(?::(\d+))?\]/gi, (_, n = '1') => {
    clicks += Number(n);
    return `<span class="slidev-note-click-mark" data-clicks="${clicks}"></span>`;
  });
  return marked.parse(withMarks, { async: false });
}
