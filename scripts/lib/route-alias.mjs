// `routeAlias` gives a slide an extra address (/intro). These names already belong to pages of the app.
const RESERVED = ['print', 'notes', 'presenter'];

/** The alias as text, or null. Throws when it would be hidden by a page of the app. */
export function checkRouteAlias(value, slideNo) {
  if (value == null) return null;
  const alias = String(value);
  if (RESERVED.includes(alias))
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" is a page of the app (${RESERVED.join(', ')}) and would never open this slide; pick another name`,
    );
  // `/2` is slide 2, so an alias of only digits would be read as a slide number and its own slide never reached.
  if (/^\d+$/.test(alias))
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" is a number, which an address reads as a slide number; pick a name such as "part-${alias}"`,
    );
  return alias;
}
