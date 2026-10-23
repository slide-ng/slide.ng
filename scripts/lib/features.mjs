// Looks through the deck to see which heavy features it uses, before anything is generated.
// Slidev does the same (`detectFeatures`): a deck without math never pays for KaTeX.
import { SNIPPET_LINE } from './code/snippet.mjs';
import { extractFences } from './fences.mjs';
import { extractMath } from './math.mjs';

// Code languages named on fences, in magic-move steps, and on `<<<` lines (by name or file extension).
export function detectLangs(text) {
  const langs = new Set();
  // Fences may be indented (inside a list or an HTML block) and may use tildes.
  for (const m of text.matchAll(/^[ \t]*(?:`{3,}|~{3,})\s*([\w#+-]+)/gm)) langs.add(m[1]);
  for (const line of text.split('\n')) {
    const m = SNIPPET_LINE.exec(line);
    if (!m) continue;
    const name = m[1];
    langs.add(m[3]?.trim() || name.split('.').pop());
  }
  return langs;
}

// Math outside code samples (a `$` in code or inline code is not math).
export function hasMath(text) {
  const prose = extractFences(text.replace(/^<<<.*$/gm, '')).markdown.replace(/(`+).+?\1/g, '');
  return extractMath(prose).maths.length > 0;
}

// An editor: a `{monaco...}` fence (also a `<<<` line or magic-move step cannot be one) or the <slide-ng-monaco> tag.
export const hasMonaco = (text) =>
  /^`{3,}[^\n]*\{monaco[\w-]*\}/m.test(text) ||
  /<slide-ng-monaco[\s>]/.test(text) ||
  /^<<<.*\{monaco[\w-]*\}/m.test(text);

// A fence with the word `twoslash` after the language.
export const hasTwoslash = (text) => /^`{3,}[^\n]*\btwoslash\b/m.test(text);

export const hasMagicMove = (text) => /^````+[ \t]*(md|markdown) magic-move/m.test(text);

// `monaco` and `twoslash` are the headmatter switches for this mode: off, the fences do not count (a `<slide-ng-monaco>` tag still does).
export function detectFeatures(slides, { monaco = true, twoslash = true } = {}) {
  const text = slides.map((s) => s.content).join('\n');
  return {
    langs: detectLangs(text),
    math: hasMath(text),
    monaco: monaco ? hasMonaco(text) : /<slide-ng-monaco[\s>]/.test(text),
    magicMove: hasMagicMove(text),
    twoslash: twoslash && hasTwoslash(text),
  };
}
