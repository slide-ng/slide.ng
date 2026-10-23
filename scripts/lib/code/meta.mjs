// Reads what follows the language on a code fence, in Slidev's syntax:
//   ```ts [title] {2,3|5|all} {lines:true,maxHeight:'100px'}
// The ranges and the options are two separate braces, as in Slidev.
const INFO =
  /^([\w'#+-]+)?(?:[ \t]*|[ \t][ \w\t'-]*)(?:\[([^\]]*)\])?[ \t]*(?:\{([\w,|\-*]+)\})?[ \t]*(\{(?:[^{}]|\{[^{}]*\})*\})?(.*)$/;

// "{lines:true, maxHeight:'100px', sequence: {mirrorActors: false}}" -> { lines: true, maxHeight: '100px', sequence: { ... } }
// Values: true, false, numbers, quoted text, a bare word (height:200px), and objects and lists of these (Mermaid's options).
export function parseOptions(text = '') {
  let i = 0;
  const space = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const scalar = (raw) => {
    const v = raw.trim();
    if (v === 'true' || v === 'false') return v === 'true';
    if (v !== '' && !isNaN(+v)) return +v;
    return v.replace(/^(['"])(.*)\1$/, '$2');
  };
  const value = () => {
    space();
    if (text[i] === '{') return object();
    if (text[i] === '[') {
      const list = [];
      i++;
      // A list left open (`[1, 2}`) ends at the `}`; every turn reads something, so a stray character cannot loop forever.
      for (space(); i < text.length && text[i] !== ']' && text[i] !== '}'; space()) {
        const at = i;
        list.push(value());
        space();
        if (text[i] === ',') i++;
        else if (i === at) i++;
      }
      if (text[i] === ']') i++;
      return list;
    }
    const quoted = /^('[^']*'|"[^"]*")/.exec(text.slice(i));
    const raw = quoted ? quoted[1] : /^[^,}\]]*/.exec(text.slice(i))[0];
    i += raw.length;
    return scalar(raw);
  };
  const object = () => {
    const out = {};
    i++; // {
    for (space(); i < text.length && text[i] !== '}'; space()) {
      const key = /^[\w$-]+/.exec(text.slice(i))?.[0];
      if (!key) {
        i++; // skip what is not a key
        continue;
      }
      i += key.length;
      space();
      if (text[i] === ':') i++;
      out[key] = value();
      space();
      if (text[i] === ',') i++;
    }
    i++; // }
    return out;
  };
  const body = text.trim();
  if (!body) return {};
  text = body.startsWith('{') ? body : `{${body}}`; // the braces may be left out
  return object();
}

// "2-3|5|all" -> ["2-3", "5", "all"]; no ranges -> []
export const splitRanges = (text = '') =>
  text.trim()
    ? text
        .trim()
        .split('|')
        .map((s) => s.trim())
    : [];

export function parseInfo(info) {
  const [, lang = '', title = '', rangeStr = '', optionText = '', rest = ''] =
    INFO.exec(info.trim()) ?? [];
  return {
    lang,
    title,
    ranges: splitRanges(rangeStr),
    options: parseOptions(optionText),
    rest: rest.trim(),
  };
}

// The title bar text: an icon written as ~icon-name~ is drawn in front of it (see title-icon.mjs).
export const cleanTitle = (title) => title.replace(/~([^~]+)~/g, '').trim();

// "{monaco}", "{monaco-diff}", "{monaco-run}" right after the language.
const MONACO = /^([\w'-]+)?\s*\{(monaco[\w-]*)\}\s*(\{(?:[^{}]|\{[^{}]*\})*\})?(.*)$/;
export function parseMonacoInfo(info) {
  const m = MONACO.exec(info.trim());
  return m ? { lang: m[1] ?? '', kind: m[2], options: parseOptions(m[3]) } : null;
}

/**
 * Why a step of the ranges (`{3-5}`) picks none of the `count` lines (or rows of a formula) shown, or ''. Ranges use the
 * numbers shown, so with `startLine:10` they are 10, 11, ...; a step that picks none of them dims every one.
 * @param {string[]} ranges @param {number} count @param {unknown} [startLine] @param {'line' | 'row'} [unit]
 */
export function rangeOutside(ranges, count, startLine, unit = 'line') {
  const first = Number.isInteger(Number(startLine)) && startLine != null ? Number(startLine) : 1;
  const last = first + count - 1;
  for (const step of ranges) {
    if (!/^[\d\s,-]+$/.test(step) || /^\s*0\s*$/.test(step)) continue; // `all`, `*`, `hide`, `0` (none)
    const picks = step.split(',').some((part) => {
      const [a, b = a] = part.split('-').map((n) => Number(n.trim()));
      return Number.isFinite(a) && Number.isFinite(b) && a <= last && b >= first;
    });
    if (!picks)
      return `the ${unit} range {${step}} is outside the ${unit}s shown (${first}-${last}${first !== 1 ? `, with startLine:${first}` : ''}), so it highlights no ${unit}; ranges use the numbers shown`;
  }
  return '';
}
