// A `slide-ng-*` element or attribute that slide.ng does not have is a typo: Angular would stop with "is not a known element"
// for a tag, and ignore an attribute without a word. Warn for both, with the nearest built-in name.
import { didYouMean } from './did-you-mean.mjs';
import { BUILTIN_ATTRIBUTES, BUILTIN_ELEMENTS } from './registry.mjs';
import { ATTRIBUTE, TAG, plainName } from './renamed.mjs';

/**
 * Warns about the unknown `slide-ng-*` names in a slide's markup (code samples taken out). `own` are the selectors of the
 * deck's and themes' components, which may use the prefix too.
 * @param {string} markup
 * @param {number} no the slide number, for the message
 * @param {Iterable<string>} [own]
 */
export function warnUnknownNames(markup, no, own = []) {
  const mine = new Set(own);
  const found = new Map();
  for (const m of markup.matchAll(TAG)) {
    const tag = m[1];
    if (tag.startsWith('slide-ng-') && !BUILTIN_ELEMENTS.includes(tag) && !mine.has(tag))
      found.set(
        `<${tag}>`,
        BUILTIN_ATTRIBUTES.includes(tag)
          ? ` It is an attribute: <div ${tag}>.`
          : didYouMean(tag, [...BUILTIN_ELEMENTS, ...mine], (n) => `<${n}>`),
      );
    for (const a of m[2].matchAll(ATTRIBUTE)) {
      const attr = plainName(a[1]);
      if (
        attr.startsWith('slide-ng-') &&
        !BUILTIN_ATTRIBUTES.includes(attr) &&
        !mine.has(`[${attr}]`)
      )
        found.set(
          attr,
          BUILTIN_ELEMENTS.includes(attr)
            ? ` It is an element: <${attr}>.`
            : didYouMean(attr, BUILTIN_ATTRIBUTES),
        );
    }
  }
  for (const [name, hint] of found)
    console.warn(`[slides] slide ${no}: ${name} is not a slide.ng name.${hint}`);
}
