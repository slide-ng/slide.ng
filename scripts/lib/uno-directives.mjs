// Slidev's two UnoCSS transformers, done by the generator: variant groups (`hover:(a b)`) in a slide's markup
// (transformerVariantGroup), and `@apply`, `--uno:`, `@screen` and `theme()` in CSS (transformerDirectives), for a slide's
// <style> and the roots' styles/ folders.
import { expandVariantGroup } from '@unocss/core';
import transformerDirectives from '@unocss/transformer-directives';
import MagicString from 'magic-string';
import { extractStyles } from './scoped-style.mjs';

const directives = transformerDirectives();

/** Does the CSS use one of the directives? */
export const hasDirectives = (css) =>
  /@apply\b|@screen\b|theme\(|icon\(|--uno|--at-apply/.test(css);

/** `css` with its directives written out as CSS. A `theme()` path UnoCSS does not know throws an error that names it. */
export async function applyDirectives(css, uno, filename = 'style.css') {
  if (!hasDirectives(css)) return css;
  const code = new MagicString(css);
  await directives.transform(code, filename, { uno });
  return code.toString();
}

/** The utilities named in `@apply` and `--uno:` that UnoCSS does not know (the transformer drops them without a word). */
export async function unknownUtilities(css, uno) {
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, ''); // a comment may mention @apply
  const names = [
    ...plain.matchAll(/(?:@apply\s|--(?:uno|at-apply|uno-apply)\s*:)\s*([^;}]+)/g),
  ].flatMap((m) => m[1].replace(/['"]/g, '').trim().split(/\s+/));
  const unknown = [];
  for (const name of new Set(names)) if (!(await uno.parseToken(name))) unknown.push(name);
  return unknown;
}

/** `applyDirectives`, with a warning that starts with `where` for unknown utilities and errors; the CSS stays as written then. */
export async function applyDirectivesOrWarn(css, uno, where) {
  try {
    const unknown = await unknownUtilities(css, uno);
    if (unknown.length) console.warn(`[slides] ${where}: unknown utilities ${unknown.join(', ')}`);
    return await applyDirectives(css, uno, 'style.css');
  } catch (e) {
    console.warn(`[slides] ${where}: ${e.message}`);
    return css;
  }
}

/**
 * The <style> blocks of the slides that use directives, written out: a map from the block's text (as `extractStyles`
 * returns it) to the CSS.
 */
export async function slideStyleDirectives(slides, uno) {
  const done = new Map();
  for (const [i, slide] of slides.entries()) {
    const { css } = extractStyles(slide.content);
    if (hasDirectives(css) && !done.has(css))
      done.set(css, await applyDirectivesOrWarn(css, uno, `slide ${i + 1}: <style>`));
  }
  return done;
}

// Attributes whose values are text or addresses, not class names: a `:(` there is left alone.
const TEXT_ATTRIBUTES =
  /^(?:alt|title|href|src|srcset|srcdoc|style|content|value|placeholder|label|action|download|poster|id|name|for|type|lang|role|aria-.*|data-.*)$/i;

/** `class="hover:(a b)"` becomes `class="hover:a hover:b"`; also in attributify values (`text="hover:(red-500 xl)"`). */
export function expandGroups(html) {
  return html.replace(/(\s)([A-Za-z][\w:-]*)="([^"]*:\([^"]*)"/g, (all, space, name, value) =>
    TEXT_ATTRIBUTES.test(name) ? all : `${space}${name}="${expandVariantGroup(value)}"`,
  );
}
