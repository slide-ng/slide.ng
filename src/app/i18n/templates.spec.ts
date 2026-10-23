import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from './en';

// Every word a person reads in the interface comes from en.ts, so a translation can change it. This looks through the
// templates of src/app for English that is written in directly: text between tags, plain text attributes, and quoted
// text in bound ones. The quoted text must be a key (`'nav.next' | t`).

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(join(dir, e.name))
      : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts')
        ? [join(dir, e.name)]
        : [],
  );

/** The inline templates of a component file. */
function templatesOf(source: string): string[] {
  return [...source.matchAll(/\btemplate:\s*(`[^`]*`|'[^']*')/g)].map((m) => m[1].slice(1, -1));
}

const TEXT_ATTRIBUTES = ['title', 'aria-label', 'placeholder', 'alt', 'label'];
// Words that stay as they are in every language: a key on the keyboard, a brand, and the content of example components.
const KEPT: Record<string, string[]> = {
  'src/app/ui/context-menu.ts': ['Shift'],
  'src/app/builtin/youtube.ts': ['title="YouTube"'],
  'src/app/layouts/end.ts': ['END'],
  'src/app/lib/counter.ts': ['counter'],
};
const isWords = (text: string) => /[A-Za-z]{2,}/.test(text);
const isKey = (text: string) => text in EN;

/** The English in a template that is not a key: one entry per piece of text. */
function untranslated(template: string): string[] {
  const found: string[] = [];
  const html = template
    .replace(/<!--[\s\S]*?-->/g, '')
    // The test readout (`#hud`) is hidden and read by the browser tests only.
    .replace(/<div id="hud"[^>]*>[\s\S]*?<\/div>/g, '');
  // Plain attributes, `title="Close"`, and quoted text in bound ones, `[title]="'Close'"`.
  for (const [, bound, name, value] of html.matchAll(/\s(\[(?:attr\.)?)?([\w-]+)\]?="([^"]*)"/g)) {
    if (!TEXT_ATTRIBUTES.includes(name)) continue;
    if (!bound) {
      if (isWords(value)) found.push(`${name}="${value}"`);
      continue;
    }
    // A quoted value that is compared (`status() === 'running'`) is not shown.
    for (const [, compared, quoted] of value.matchAll(/(===?\s*|!==?\s*)?'([^']*)'/g))
      if (!compared && isWords(quoted) && !isKey(quoted)) found.push(`[${name}]: '${quoted}'`);
  }
  // Text between tags, without interpolations, control flow and the brand name.
  const text = html
    .replace(/\{\{[\s\S]*?\}\}/g, ' ')
    .replace(/<\/?[A-Za-z][\w-]*(?:\s+[^\s=>/]+(?:="[^"]*"|='[^']*')?)*\s*\/?>/g, ' ')
    .replace(/@let\b[^;]*;/g, ' ')
    .replace(
      /@(?:if|else|for|switch|case|default|defer|placeholder|loading|error|empty)\b[^{]*\{|\}/g,
      ' ',
    )
    .replace(/\bslide\.ng\b/g, ' ');
  for (const piece of text.split(/\s{2,}|\n/).map((t) => t.trim()))
    if (isWords(piece)) found.push(piece);
  return found;
}

describe('interface text', () => {
  it('finds English text and lets keys through', () => {
    expect(untranslated('<button title="Close">Next</button>')).toEqual(['title="Close"', 'Next']);
    expect(untranslated(`<b [title]="'Go on'">{{ 'nav.next' | t }}</b>`)).toEqual([
      "[title]: 'Go on'",
    ]);
    expect(
      untranslated(`@if (a) { <i [title]="(a ? 'nav.prev' : 'nav.next') | t"></i> } @else { }`),
    ).toEqual([]);
    expect(untranslated('<div class="i-carbon:pen" id="x"></div><b>slide.ng</b>')).toEqual([]);
    expect(
      untranslated(`<i [title]="(s() === 'running' ? 'timer.pause' : 'timer.start') | t"></i>`),
    ).toEqual([]);
    expect(untranslated('@let x = a(); @else if (b()) { Hello }')).toEqual(['Hello']);
  });

  it('no page title of the app is English written in', () => {
    const problems: string[] = [];
    for (const file of files('src/app')) {
      const source = readFileSync(file, 'utf8');
      // `setTitle(`Overview - ${title}`)` or `title = `Overview - ${title}``: the words outside `${}` must come from a key.
      for (const [, text] of source.matchAll(/(?:setTitle\(|\btitle\s*=)\s*`([^`]*)`/g))
        if (isWords(text.replace(/\$\{[^}]*\}/g, ' '))) problems.push(`${file}: ${text}`);
    }
    expect(problems).toEqual([]);
  });

  it('no template of the app has English that is not a translation key', () => {
    const problems: string[] = [];
    for (const file of files('src/app'))
      for (const template of templatesOf(readFileSync(file, 'utf8')))
        for (const text of untranslated(template))
          if (!KEPT[file]?.includes(text)) problems.push(`${file}: ${text}`);
    expect(problems).toEqual([]);
  });
});
