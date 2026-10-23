// Per-slide <style> blocks. We cut them out of the markdown (outside code fences) and
// return the CSS separately; emit.mjs puts it into the slide component, scoped to that slide.
export function extractStyles(markdown) {
  const css = [];
  // Splitting with a capture group puts the code (fences, also indented in a list, and inline code), quoted attribute
  // values (`<iframe srcdoc="<style>...">` keeps its own styles) and the style blocks at the odd positions. A style
  // block is matched whole, so a quoted selector in it (`[lang='de']`) is not taken for an attribute value.
  const parts = markdown.split(
    /(^[ \t]*```.*\n[\s\S]*?^[ \t]*```[ \t]*$|`[^`\n]+`|<style[^>]*>[\s\S]*?<\/style>|=\s*"[^"]*"|=\s*'[^']*')/gm,
  );
  const text = parts
    .map((part, i) => {
      const style = i % 2 ? /^<style[^>]*>([\s\S]*)<\/style>$/.exec(part) : null;
      if (!style) return part;
      css.push(style[1].trim());
      return '';
    })
    .join('');
  return { markdown: text, css: css.join('\n') };
}

// The slide's host tag (`slide-003`) is the scope: `slide-003 { h1 { color: red } }` uses
// native CSS nesting, so every selector the author writes only matches inside this slide.
// @keyframes, @font-face, @property, @counter-style and @import cannot be nested, so they stay outside the scope.
export function scopeCss(css, selector) {
  if (!css) return '';
  const { global, rest } = splitGlobalRules(css);
  const scoped = rest.trim() ? `${selector} {\n${rest}\n}` : '';
  return [global, scoped].filter(Boolean).join('\n');
}

const GLOBAL_AT = /^@(?:-webkit-)?(?:keyframes|font-face|property|counter-style|import)\b/;

// Top-level rules that must not be nested, cut out with their braces (or up to `;` for @import).
function splitGlobalRules(css) {
  let global = '',
    rest = '',
    i = 0;
  while (i < css.length) {
    const at = css.indexOf('@', i);
    if (at < 0 || depthAt(css, at) > 0 || !GLOBAL_AT.test(css.slice(at))) {
      const next = at < 0 ? css.length : at + 1;
      rest += css.slice(i, next);
      i = next;
      continue;
    }
    rest += css.slice(i, at);
    const semi = css.indexOf(';', at);
    const open = css.indexOf('{', at);
    let end;
    if (open < 0 || (semi >= 0 && semi < open)) end = semi < 0 ? css.length : semi + 1;
    else {
      let depth = 0;
      end = open;
      for (; end < css.length; end++) {
        if (css[end] === '{') depth++;
        else if (css[end] === '}' && --depth === 0) break;
      }
      end++;
    }
    global += css.slice(at, end).trim() + '\n';
    i = end;
  }
  return { global: global.trim(), rest };
}

// How many braces are open at `index` (0 = top level).
function depthAt(css, index) {
  let depth = 0;
  for (let k = 0; k < index; k++) {
    if (css[k] === '{') depth++;
    else if (css[k] === '}') depth--;
  }
  return depth;
}
