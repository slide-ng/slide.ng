// Slidev writes `v-mark.red.circle="2"` and `v-motion :initial="{ x: 0 }"`; here the names are `slide-ng-mark` and
// `slide-ng-motion`, with the same modifiers and props. Those are Vue
// forms Angular cannot read, so this turns them into plain Angular attributes:
//   slide-ng-mark.red.circle="2"     ->  mark-mods="red.circle" slide-ng-mark="2"
//   slide-ng-mark="{ at: 2 }"        ->  [slide-ng-mark]="{ at: 2 }"
//   slide-ng-motion :initial=".." :click-1=".."  ->  [slide-ng-motion]="{ initial: .., 'click-1': .. }"
//   slide-ng-click.fade.right="2"   ->  click-anim="fade.right" slide-ng-click="2"   (also slide-ng-after, slide-ng-click-hide)
//   slide-ng-click.up="[2, 4]"      ->  click-anim="up" [slide-ng-click]="[2, 4]"   (a range is bound, as Slidev's v-click="[2, 4]")
//   [slide-ng-click.up]="range"     ->  click-anim="up" [slide-ng-click]="range"

const TAG = /<([a-z][\w-]*)((?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
const ATTR = /\s+([^\s=>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
const VARIANT = /^:(initial|enter|leave|click-\d+(?:-\d+)?)$/;
const CLICK = /^(\[?)(slide-ng-(?:click-hide|click|after))(?:\.([^\]]+))?\]?$/;
const RANGE = /^\s*\[/;

/** @param {string} html markdown with code already taken out */
export function rewriteDirectives(html) {
  return html.replace(TAG, (tag, name, attrText, close) => {
    if (
      !/\sslide-ng-(mark|motion)\b|\s\[?slide-ng-(click-hide|click|after)(\.|\s*=\s*["']\s*\[)/.test(
        attrText,
      )
    )
      return tag;
    const attrs = [...attrText.matchAll(ATTR)].map((m) => ({
      name: m[1],
      value: m[2] ?? m[3],
      quote: m[3] != null ? "'" : '"',
    }));
    const out = [];
    const variants = [];
    let motion = false;
    for (const a of attrs) {
      const variant = VARIANT.exec(a.name);
      const click = clickAttr(a);
      if (/^slide-ng-mark(\.|$)/.test(a.name)) out.push(...markAttrs(a));
      else if (click) out.push(...clickAttrs(click[2], click[3] ?? '', a, !!click[1]));
      else if (a.name === 'slide-ng-motion') motion = true;
      else if (variant) variants.push(`'${variant[1]}': (${a.value})`);
      else if (/^:(hovered|tapped|focused|visible|variants)/.test(a.name))
        console.warn(`[slide.ng] slide-ng-motion does not support ${a.name}, it is ignored`);
      else out.push(a.value == null ? a.name : `${a.name}=${a.quote}${a.value}${a.quote}`);
    }
    if (motion) out.push(`[slide-ng-motion]="{ ${variants.join(', ')} }"`);
    return `<${name} ${out.join(' ')}${close ? ' /' : ''}>`;
  });
}

// `slide-ng-click.fade.right="2"` -> the directive and its click animation presets. `.hide` is not a preset: like
// Slidev's `v-click.hide` it shows the element first and hides it at its click, which is the `slide-ng-click-hide` flag.
// A range such as `"[2, 4]"` is bound (`[slide-ng-click]`) so the directive gets an array, not the text "[2, 4]".
function clickAttrs(directive, modifiers, a, bound) {
  const mods = modifiers.split('.').filter(Boolean);
  const presets = mods.filter((m) => m !== 'hide');
  const out = presets.length ? [`click-anim="${presets.join('.')}"`] : [];
  const name = bound || RANGE.test(a.value ?? '') ? `[${directive}]` : directive;
  out.push(a.value == null ? name : `${name}=${a.quote}${a.value}${a.quote}`);
  if (mods.includes('hide') && directive !== 'slide-ng-click-hide') out.push('slide-ng-click-hide');
  return out;
}

// The click directive in `a` when the generator has to rewrite it (modifiers, or a range written as a plain attribute).
function clickAttr(a) {
  const m = CLICK.exec(a.name);
  if (!m || !!m[1] !== a.name.endsWith(']')) return null;
  if (m[1] ? !m[3] : !m[3] && !RANGE.test(a.value ?? '')) return null;
  return m;
}

// One slide-ng-mark attribute -> the attributes Angular needs.
function markAttrs(a) {
  const [, mods = ''] = /^slide-ng-mark\.?(.*)$/.exec(a.name);
  const out = mods ? [`mark-mods="${mods}"`] : [];
  const value = a.value?.trim();
  if (value && /^[{[]/.test(value))
    out.push(`[slide-ng-mark]="${value}"`); // an object or a range: Vue expression
  else if (value && /^'.*'$/.test(value))
    out.push(`slide-ng-mark="${value.slice(1, -1)}"`); // slide-ng-mark="'+1'"
  else out.push(value == null ? 'slide-ng-mark' : `slide-ng-mark="${value}"`);
  return out;
}
