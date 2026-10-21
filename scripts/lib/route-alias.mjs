// `routeAlias` gives a slide an extra address (/intro). These names already belong to pages of the app.
const RESERVED = ['print', 'notes', 'presenter'];

/** The alias as text, or null. Throws when it would be hidden by a page of the app. */
export function checkRouteAlias(value, slideNo) {
  if (value == null) return null;
  const alias = String(value);
  if (!alias.trim())
    throw new Error(`slide ${slideNo}: routeAlias is empty; give it a name or leave the key out`);
  if (RESERVED.includes(alias))
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" is a page of the app (${RESERVED.join(', ')}) and would never open this slide; pick another name`,
    );
  // `/2` is slide 2, so an alias of only digits would be read as a slide number and its own slide never reached.
  if (/^\d+$/.test(alias))
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" is a number, which an address reads as a slide number; pick a name such as "part-${alias}"`,
    );
  // `/a/b` is two parts of an address and `/a.b` reads as a file; `?` and `#` start the query and the hash.
  const sign = /[/.?#\\]/.exec(alias)?.[0];
  if (sign)
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" has "${sign}", which an address does not keep in one name; pick a name without it`,
    );
  return alias;
}

/** Throws when two slides have the same routeAlias (the address would only ever open the first). @param {(string | null)[]} aliases */
export function checkUniqueAliases(aliases) {
  const seen = new Map();
  aliases.forEach((alias, i) => {
    if (alias == null) return;
    if (!seen.has(alias)) return seen.set(alias, [i + 1]);
    seen.get(alias).push(i + 1);
  });
  for (const [alias, nos] of seen)
    if (nos.length > 1)
      throw new Error(
        `slides ${nos.join(', ')}: routeAlias "${alias}" is on more than one slide, and /${alias} only opens the first; give each its own (a routeAlias on a src: import of several slides is on each of them)`,
      );
}
