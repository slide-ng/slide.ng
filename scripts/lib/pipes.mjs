// Angular's common pipes that a slide uses (`{{ price | currency }}`), so the generated component can import them.
// Only Angular expressions are searched: interpolations, bound attributes and control-flow headers, never prose or tables.

const PIPES = {
  async: 'AsyncPipe',
  currency: 'CurrencyPipe',
  date: 'DatePipe',
  i18nPlural: 'I18nPluralPipe',
  i18nSelect: 'I18nSelectPipe',
  json: 'JsonPipe',
  keyvalue: 'KeyValuePipe',
  lowercase: 'LowerCasePipe',
  number: 'DecimalPipe',
  percent: 'PercentPipe',
  slice: 'SlicePipe',
  titlecase: 'TitleCasePipe',
  uppercase: 'UpperCasePipe',
};

/** The names of all pipes used in a template's Angular expressions (`{{ x | initials }}` gives `initials`). */
export function pipeNames(template) {
  const expressions = [
    ...template.matchAll(/\{\{([\s\S]*?)\}\}/g),
    ...template.matchAll(/\s[[(*][^\s=]*="([^"]*)"/g),
    ...template.matchAll(/\s[[(*][^\s=]*='([^']*)'/g),
    ...template.matchAll(/@(?:if|else|for|switch|case|let|defer)\b([^\n]*)/g),
  ].map((m) => m[1]);
  const found = new Set();
  for (const e of expressions)
    // `||` is a logical or, not a pipe
    for (const m of e.matchAll(/(?<!\|)\|(?!\|)\s*([A-Za-z]\w*)/g)) found.add(m[1]);
  return found;
}

/** The class names of the common pipes used in a slide's template, sorted. */
export function commonPipes(template) {
  return [...pipeNames(template)]
    .filter((name) => Object.hasOwn(PIPES, name))
    .map((name) => PIPES[name])
    .sort();
}
