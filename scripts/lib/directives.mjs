// Slidev writes `v-mark.red.circle="2"` and `v-motion :initial="{ x: 0 }"`; here the names are `slide-ng-mark` and
// `slide-ng-motion`, with the same modifiers and props. Those are Vue
// forms Angular cannot read, so this turns them into plain Angular attributes:
//   slide-ng-mark.red.circle="2"     ->  mark-mods="red.circle" slide-ng-mark="2"
//   slide-ng-mark="{ at: 2 }"        ->  [slide-ng-mark]="{ at: 2 }"
//   slide-ng-motion :initial=".." :click-1=".."  ->  [slide-ng-motion]="{ initial: .., 'click-1': .. }"
//   slide-ng-click.fade.right="2"   ->  click-anim="fade.right" slide-ng-click="2"   (also slide-ng-after, slide-ng-click-hide)

const TAG = /<([a-z][\w-]*)((?:\s+[^\s=>"'/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
const ATTR = /\s+([^\s=>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
const VARIANT = /^:(initial|enter|leave|click-\d+(?:-\d+)?)$/;
const CLICK = /^(slide-ng-(?:click-hide|click|after))\.(.+)$/;

/** @param {string} html markdown with code already taken out */
export function rewriteDirectives(html) {
  return html.replace(TAG, (tag, name, attrText, close) => {
    if (!/\sslide-ng-(mark|motion)\b|\sslide-ng-(click-hide|click|after)\./.test(attrText))
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
      const click = CLICK.exec(a.name);
      if (/^slide-ng-mark(\.|$)/.test(a.name)) out.push(...markAttrs(a));
      else if (click) out.push(...clickAttrs(click[1], click[2], a));
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

// `slide-ng-click.fade.right="2"` -> the directive and its click animation presets. `.hide` is not a preset (Slidev's
// `v-click.hide`); here that is `slide-ng-click-hide`.
function clickAttrs(directive, modifiers, a) {
  const mods = modifiers.split('.').filter(Boolean);
  if (mods.includes('hide'))
    console.warn(`[slide.ng] ${directive}.hide is not supported, use slide-ng-click-hide`);
  const presets = mods.filter((m) => m !== 'hide');
  const out = presets.length ? [`click-anim="${presets.join('.')}"`] : [];
  out.push(a.value == null ? directive : `${directive}=${a.quote}${a.value}${a.quote}`);
  return out;
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
