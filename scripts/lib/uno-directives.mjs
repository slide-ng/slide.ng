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
  ].flatMap((m) => expandVariantGroup(m[1].replace(/['"]/g, '')).trim().split(/\s+/)); // as the transformer reads it
  const unknown = [];
  for (const name of new Set(names)) if (!(await uno.parseToken(name))) unknown.push(name);
  return unknown;
}

/**
 * `applyDirectives`, with a warning that starts with `where` for unknown utilities and errors; the CSS stays as written then.
 * With `scoped`, the CSS goes into a slide's scope (scopeCss) after: see `markScope`.
 */
export async function applyDirectivesOrWarn(css, uno, where, scoped = false) {
  try {
    const unknown = await unknownUtilities(css, uno);
    if (unknown.length) console.warn(`[slides] ${where}: unknown utilities ${unknown.join(', ')}`);
    if (!scoped) return await applyDirectives(css, uno, 'style.css');
    return (await applyDirectives(markScope(css), uno, 'style.css')).replace(SCOPE_MARK, '& ');
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
      done.set(css, await applyDirectivesOrWarn(css, uno, `slide ${i + 1}: <style>`, true));
  }
  return done;
}

// A variant can put an ancestor in front of the selector (`dark:` gives `.dark h1`, `forward:` `.slidev-nav-go-forward h1`);
// nested in the slide's scope that would be `slide-002 .dark h1`, which never matches. So each selector of a rule with a
// directive (at the top, or in @media and the like) gets a mark first, `.__slide-scope h1`; the transformer keeps it where
// the selector was (`.dark .__slide-scope h1`), and it becomes `&`, the scope: `.dark & h1`, as Slidev's `.dark h1[data-v-…]`.
const SCOPE_MARK = /\.__slide-scope\s+/g;
const GROUP_AT = /^@(?:media|supports|container|layer|screen)\b/;

function markScope(css) {
  let out = '',
    start = 0; // where the text before the next `{` starts
  const open = []; // per open brace: can a rule inside it get the mark
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end < 0 ? css.length : end + 1;
    } else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === '\\') i++;
    } else if (c === ';' || c === '}') {
      if (c === '}') open.pop();
      out += css.slice(start, i + 1);
      start = i + 1;
    } else if (c === '{') {
      const prelude = css.slice(start, i).replace(/\/\*[\s\S]*?\*\//g, '');
      const at = prelude.trim().startsWith('@');
      const outer = open.every(Boolean);
      out +=
        outer && !at && hasDirectives(css.slice(i, blockEnd(css, i)))
          ? splitSelectors(prelude)
              .map((s) => `.__slide-scope ${s.trim()}`)
              .join(',')
          : css.slice(start, i);
      out += '{';
      open.push(outer && at && GROUP_AT.test(prelude.trim()));
      start = i + 1;
    }
  }
  return out + css.slice(start);
}

// The index after the `}` that closes the block opening at `from`.
function blockEnd(css, from) {
  let depth = 0;
  for (let k = from; k < css.length; k++) {
    if (css[k] === '{') depth++;
    else if (css[k] === '}' && --depth === 0) return k + 1;
  }
  return css.length;
}

// A selector list split at its top-level commas (not the ones in `:is(a, b)` or `[x="a,b"]`).
function splitSelectors(list) {
  const parts = [];
  let depth = 0,
    from = 0;
  for (let k = 0; k < list.length; k++) {
    if ('(['.includes(list[k])) depth++;
    else if (')]'.includes(list[k])) depth--;
    else if (list[k] === ',' && depth === 0) (parts.push(list.slice(from, k)), (from = k + 1));
  }
  return [...parts, list.slice(from)];
}

// Attributes whose values are text or addresses, not class names: a `:(` there is left alone.
const TEXT_ATTRIBUTES =
  /^(?:alt|title|href|src|srcset|srcdoc|style|content|value|placeholder|label|action|download|poster|id|name|for|type|lang|role|aria-.*|data-.*)$/i;

/**
 * `class="hover:(a b)"` becomes `class="hover:a hover:b"`; also in attributify values (`text="hover:(red-500 xl)"`). Code
 * blocks and inline code are text (shiki keeps a plain `"` there), so they stay as they are.
 */
export function expandGroups(html) {
  return html
    .split(/(<pre[\s>][\s\S]*?<\/pre>|<code ngNonBindable>[\s\S]*?<\/code>)/)
    .map((part, i) =>
      i % 2
        ? part
        : part.replace(/(\s)([A-Za-z][\w:-]*)="([^"]*:\([^"]*)"/g, (all, space, name, value) =>
            TEXT_ATTRIBUTES.test(name) ? all : `${space}${name}="${expandVariantGroup(value)}"`,
          ),
    )
    .join('');
}
