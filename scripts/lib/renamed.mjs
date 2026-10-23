// The old names of the built-in elements and attributes. They are not accepted any more (no aliases):
// a slide that still uses one stops the generator with a message that says what to write instead.
// docs/RENAMES.md has the same table and the rule behind it.

/** Old attribute name -> new attribute name (`v-click`, and `[v-click]` or `v-mark.red` are the same names). */
export const RENAMED_ATTRIBUTES = {
  'v-click': 'slide-ng-click',
  'v-after': 'slide-ng-after',
  'v-click-hide': 'slide-ng-click-hide',
  'v-mark': 'slide-ng-mark',
  'v-motion': 'slide-ng-motion',
  'v-drag': 'slide-ng-drag',
};

/** Old element name -> new element name (`<v-click>` and `<v-after>` have no element: they are attributes on a <div>). */
export const RENAMED_ELEMENTS = {
  'v-click': '<div slide-ng-click>',
  'v-after': '<div slide-ng-after>',
  'v-clicks': 'slide-ng-clicks',
  'v-click-gap': 'slide-ng-click-gap',
  'v-switch': 'slide-ng-switch',
  'v-drag': 'slide-ng-drag',
  'v-drag-arrow': 'slide-ng-drag-arrow',
  'slide-toc': 'slide-ng-toc',
  toc: 'slide-ng-toc',
  'slide-current-no': 'slide-ng-current-no',
  'slides-total': 'slide-ng-total',
  'slide-link': 'slide-ng-link',
  'slide-video': 'slide-ng-video',
  'slidev-video': 'slide-ng-video',
  'light-or-dark': 'slide-ng-light-or-dark',
  'render-when': 'slide-ng-render-when',
  arrow: 'slide-ng-arrow',
  transform: 'slide-ng-transform',
  'auto-fit-text': 'slide-ng-auto-fit-text',
  youtube: 'slide-ng-youtube',
  tweet: 'slide-ng-tweet',
  'blue-sky': 'slide-ng-blue-sky',
  'code-group': 'slide-ng-code-group',
  'code-block-wrapper': 'slide-ng-code-block-wrapper',
  'shiki-magic-move': 'slide-ng-magic-move',
  'katex-block-wrapper': 'slide-ng-katex-block-wrapper',
  mermaid: 'slide-ng-mermaid',
  'plant-uml': 'slide-ng-plant-uml',
  monaco: 'slide-ng-monaco',
};

// Slidev's component names (`<VClick>`, `<Toc />`, `<SlidevVideo>`): each old kebab name in PascalCase, and three more
// (`link` is an HTML element, Slidev writes `KaTex`, and `<TitleRenderer>` had no older name here).
const pascal = (name) => name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
export const RENAMED_PASCAL = {
  ...Object.fromEntries(Object.entries(RENAMED_ELEMENTS).map(([o, n]) => [pascal(o), n])),
  Link: 'slide-ng-link',
  KaTexBlockWrapper: 'slide-ng-katex-block-wrapper',
  TitleRenderer: 'slide-ng-title-renderer',
};

// <tag attributes>, where the attributes may hold quoted `>` characters.
// Any tag, also Slidev's PascalCase names (`<VClick>`), for the renamed check; unknown-names.mjs reads the lower-case ones only.
const ANY_TAG = /<([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;
export const TAG = /<([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^<>"'])*)>/g;
export const ATTRIBUTE = /\s+([^\s=>"']+)(?:\s*=\s*(?:"[^"]*"|'[^']*'))?/g;
// `v-click`, `[v-click]`, `v-mark.red.circle` -> the name without binding brackets and modifiers
export const plainName = (attr) => attr.replace(/^\[|\]$/g, '').split('.')[0];

/** The error for old names: slideSources (emit.mjs) collects it from every slide, so one run lists them all. */
export class RenamedError extends Error {}

/**
 * Throws when the markup uses an old name. `own` lists the selectors of the deck's own components: a theme or deck
 * that has a component called `<arrow>` still gets it.
 * @param {string} markup the slide's HTML, code samples already taken out
 * @param {number} no the slide number, for the message
 * @param {Iterable<string>} [own]
 */
export function assertNoRenamedNames(markup, no, own = []) {
  const mine = new Set(own);
  const found = new Map(); // every old name on the slide, so one run lists them all
  for (const m of markup.matchAll(ANY_TAG)) {
    const name = m[1];
    const to = Object.hasOwn(RENAMED_ELEMENTS, name)
      ? RENAMED_ELEMENTS[name]
      : Object.hasOwn(RENAMED_PASCAL, name)
        ? RENAMED_PASCAL[name]
        : null;
    if (to && !mine.has(name)) found.set(`<${name}>`, to);
    for (const a of m[2].matchAll(ATTRIBUTE)) {
      const attr = plainName(a[1]);
      if (Object.hasOwn(RENAMED_ATTRIBUTES, attr) && !mine.has(`[${attr}]`))
        found.set(attr, RENAMED_ATTRIBUTES[attr]);
    }
  }
  if (found.size)
    throw new RenamedError(
      `slide ${no}: ${[...found]
        .map(([o, n]) =>
          n.startsWith('<')
            ? `"${o}" has no element of its own: use ${n}`
            : `"${o}" was renamed to ${n}`,
        )
        .join(', ')} (see docs/RENAMES.md)`,
    );
}
