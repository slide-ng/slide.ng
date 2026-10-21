// Click values the app can only reject at run time (in the browser console, without a slide number): the generator reads
// the ones written as plain text and says what is wrong, with the slide and the line. `clicks` and `clicksStart` in the
// frontmatter are checked here too.

/**
 * `clicks` and `clicksStart` of a slide's frontmatter as numbers, or null when not set. A value that is not a number, or a
 * negative `clicks`, is ignored with a warning; a negative `clicksStart` counts as 0 (the presenter and the export would
 * otherwise get steps that change nothing).
 * @param {Record<string, unknown>} frontmatter @param {(message: string) => void} warn
 */
export function clickSettings(frontmatter, warn) {
  const read = (key) => {
    const raw = frontmatter[key];
    if (raw == null || raw === '') return null;
    const v = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(v)) {
      warn(`${key}: ${JSON.stringify(raw)} is not a number, it is ignored`);
      return null;
    }
    return v;
  };
  let clicks = read('clicks');
  let clicksStart = read('clicksStart');
  if (clicks != null && clicks < 0) {
    warn(`clicks: ${clicks} is below 0, it is ignored`);
    clicks = null;
  }
  if (clicksStart != null && clicksStart < 0) {
    warn(`clicksStart: ${clicksStart} is below 0, 0 is used`);
    clicksStart = 0;
  }
  return { clicks, clicksStart };
}

// Code is text: its lines are kept (as empty lines) so that the line numbers stay right.
const blank = (text) => text.replace(/[^\n]/g, '');
const withoutCode = (markdown) =>
  markdown
    .replace(
      /^([ \t]*)(`{3,}|~{3,})([^\n]*)\n[\s\S]*?^[ \t]*\2[ \t]*$/gm,
      (all, indent, ticks, info) => {
        const open = indent + ticks + info;
        return open + blank(all.slice(open.length));
      },
    )
    .replace(/`[^`\n]*`/g, (code) => ' '.repeat(code.length));

const TAG = /<([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;
const ATTRIBUTE = /\s([^\s=>"'/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
// What takes clicks before an element, so a relative value that counts back (`-1`) has something to count from.
const CLICK_TAKER =
  /\s\[?slide-ng-(?:click|after)\b|<slide-ng-(?:clicks|switch|magic-move)\b|^[ \t]*(?:`{3,}|~{3,})[^\n]*(?:\{[^}\n]*\||monaco-run|magic-move)/m;
const NUMBER = /^[+-]?\d+(?:\.\d+)?$/;

// One value of a range written as a binding: a number, or something the generator cannot judge (a string, an expression).
const rangePart = (text) => (NUMBER.test(text.trim()) ? +text : undefined);

/** A range `[start, end]` (bound, or written as text, which the generator binds): two values, the end after the start. */
function checkRange(shown, value, line, warn) {
  const list = /^\s*\[([^[\]]*)\]\s*$/.exec(value);
  if (!list) return;
  const parts = list[1].trim() ? list[1].split(',') : [];
  if (parts.length !== 2) {
    warn(
      `${shown}: a range has two values, [start, end]${parts.length === 1 ? `; for one click write slide-ng-click="${parts[0].trim()}"` : ''}`,
      line,
    );
    return;
  }
  const [start, end] = parts.map(rangePart);
  if (start == null || end == null) return;
  if (Math.max(start, 1) >= Math.max(end, 1))
    warn(
      `${shown} is never shown: the end must be after the start (clicks count from 1, the end is not included)`,
      line,
    );
  else if (start <= 0) warn(`${shown}: clicks count from 1, so it starts at click 1`, line);
}

/**
 * Warns about click values written as text that do not work: `slide-ng-click="abc"`, `"0"`, a `-1` with no click
 * before it, a range (bound, or written as text: `slide-ng-click="[2, 4]"`) with one value or none
 * (`[slide-ng-click]="[2]"`) or whose end is not after its start, and an `at` of a `<slide-ng-switch>` child that is
 * not `3` or `3-5`. Values that are expressions are left to the app.
 * @param {string} markdown the slide's markdown @param {(message: string, line: number) => void} warn line counts from 0
 */
export function checkClickValues(markdown, warn) {
  const text = withoutCode(markdown);
  const lineAt = (index) => text.slice(0, index).split('\n').length - 1;
  // The inside of each <slide-ng-switch>, to know which `at` belongs to a switch child.
  const switches = [...text.matchAll(/(<slide-ng-switch\b[^>]*>)[\s\S]*?<\/slide-ng-switch>/g)].map(
    (m) => [m.index + m[1].length, m.index + m[0].length],
  );
  const inSwitch = (index) => switches.some(([from, to]) => index >= from && index < to);

  for (const tag of text.matchAll(TAG)) {
    const [, name, attrs] = tag;
    const line = lineAt(tag.index);
    const before = text.slice(0, tag.index);
    for (const a of attrs.matchAll(ATTRIBUTE)) {
      const attr = a[1];
      const value = a[2] ?? a[3];
      if (value == null || value.includes('{{')) continue; // an interpolation is worked out by the app
      const plain = attr.split('.')[0];
      if (plain === 'slide-ng-click') {
        const v = value.trim();
        const shown = `${attr}="${value}"`;
        // A range written as text is bound by the generator (directives.mjs), so it is checked as a range.
        if (/^\[.*\]$/s.test(v)) checkRange(shown, v, line, warn);
        else if (v === '' || v === 'true' || v === 'false') continue;
        else if (!NUMBER.test(v))
          warn(`${shown} is not a click (a number, +n or -n); the element is always shown`, line);
        else if (!/^[+-]/.test(v) && +v <= 0)
          warn(`${shown}: clicks count from 1, so it is shown at click 1`, line);
        else if (v.startsWith('-') && !CLICK_TAKER.test(before))
          warn(
            `${shown} counts back from the click before it, and there is none; the element is always shown`,
            line,
          );
      } else if (attr.split('.')[0] === '[slide-ng-click]' || /^\[slide-ng-click\./.test(attr)) {
        checkRange(`${attr}="${value}"`, value, line, warn);
      } else if (attr === 'at' && inSwitch(tag.index) && !name.startsWith('slide-ng-')) {
        // As the app reads it (slide-ng-switch.ts parseSlots): digits, or two numbers with a dash.
        const range = /^\d+$/.test(value) ? [] : value.split('-').map(Number);
        if (range.length && (range.length !== 2 || !range.every(Number.isFinite)))
          warn(
            `<${name} at="${value}"> in <slide-ng-switch>: write a click (3) or a range (3-5)`,
            line,
          );
        else if (range.length && range[1] <= range[0])
          warn(
            `<${name} at="${value}"> in <slide-ng-switch> is never shown: the end must be after the start`,
            line,
          );
      }
    }
  }
}
