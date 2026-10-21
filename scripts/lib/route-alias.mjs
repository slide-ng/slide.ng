// `routeAlias` gives a slide an extra address (/intro). These names already belong to pages of the app.
const RESERVED = ['print', 'notes', 'presenter', 'overview', 'entry', 'notes-edit'];

/** The alias as text, or null. Throws when it would be hidden by a page of the app. */
export function checkRouteAlias(value, slideNo) {
  if (value == null) return null;
  const alias = String(value);
  if (RESERVED.includes(alias))
    throw new Error(
      `slide ${slideNo}: routeAlias "${alias}" is a page of the app (${RESERVED.join(', ')}) and would never open this slide; pick another name`,
    );
  return alias;
}
