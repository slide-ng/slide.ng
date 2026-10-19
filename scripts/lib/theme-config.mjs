// The `themeConfig` headmatter, as in Slidev (`themeVars` in packages/client/env.ts): each key becomes `--slidev-theme-<key>`
// with the same name (`primary` is `--slidev-theme-primary`), set on `body`, so it wins over `:root` and `html.dark` in any CSS.
// Here it is generated CSS (theme.css) instead of an inline style, so print, export and offline builds have it too.

// A custom property name may hold more, but a theme key is a plain word; anything else is skipped with a warning.
const KEY = /^[A-Za-z0-9_-]+$/;
// Characters that could end the declaration or the rule, open a comment or a tag, or escape the next character.
const UNSAFE = /[;{}<>\\\n\r\f]|\/\*|\*\//;

// Quotes and brackets must close: an open string or `url(` would run into the next declaration.
function isBalanced(value) {
  const closers = [];
  let quote = null;
  for (const c of value) {
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '(') closers.push(')');
    else if (c === '[') closers.push(']');
    else if (c === ')' || c === ']') {
      if (closers.pop() !== c) return false;
    }
  }
  return !quote && !closers.length;
}

/** Why `value` cannot be written as a CSS value, or null when it can. */
export function unsafeCssValue(value) {
  if (!value.trim()) return 'it is empty';
  if (UNSAFE.test(value)) return 'it contains ; { } < > \\, a comment or a line break';
  if (!isBalanced(value)) return 'its quotes or brackets do not close';
  return null;
}

/**
 * The CSS variables of `themeConfig`: `vars` are [name, value] pairs, `problems` say which keys were skipped and why.
 * Only strings and numbers become variables; other values (lists, objects, booleans) stay readable through THEME_CONFIG.
 */
export function themeConfigVars(themeConfig) {
  const vars = [];
  const problems = [];
  if (themeConfig == null) return { vars, problems };
  if (typeof themeConfig !== 'object' || Array.isArray(themeConfig)) {
    problems.push('themeConfig must be a map of keys and values; ignored');
    return { vars, problems };
  }
  for (const [key, raw] of Object.entries(themeConfig)) {
    const isNumber = typeof raw === 'number' && Number.isFinite(raw);
    if (typeof raw !== 'string' && !isNumber) continue;
    if (!KEY.test(key)) {
      problems.push(
        `themeConfig.${key} is not set as a CSS variable: use letters, digits, - and _ in the key`,
      );
      continue;
    }
    const value = String(raw).trim();
    const reason = unsafeCssValue(value);
    if (reason) problems.push(`themeConfig.${key} is not set as a CSS variable: ${reason}`);
    else vars.push([`--slidev-theme-${key}`, value]);
  }
  return { vars, problems };
}

/** The rule for theme.css (empty without `themeConfig`). Comes after the roots' style sheets, so it also wins on order. */
export function themeConfigCss(themeConfig) {
  const { vars } = themeConfigVars(themeConfig);
  if (!vars.length) return '';
  return `body {\n${vars.map(([name, value]) => `  ${name}: ${value};`).join('\n')}\n}\n`;
}
