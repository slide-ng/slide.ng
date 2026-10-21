// The pure part of slide-ng-motion: which variants apply, and how a variant becomes CSS.
// A variant is a plain object like { x: 40, opacity: 0.5, transition: { duration: 300 } }.
export type Variant = Record<string, unknown>;
export type Variants = Record<string, Variant | undefined>;
export type Phase = 'initial' | 'enter' | 'leave';

const CLICK_KEY = /^click-(\d+)(?:-(\d+))?$/;
const TRANSFORM_KEYS = ['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate'];
const UNITLESS = ['opacity', 'zIndex'];

/** The click variants that are active at `current`, in the order they must be applied (later clicks win). */
function clickVariants(variants: Variants, current: number | 'all'): Variant[] {
  const found: { from: number; variant: Variant }[] = [];
  for (const [key, variant] of Object.entries(variants)) {
    const m = CLICK_KEY.exec(key);
    if (!m || !variant) continue;
    const from = +m[1],
      to = m[2] ? +m[2] : Infinity;
    // `all` is the state after every click: a range that has ended (`click-2-4`) is over by then.
    const at = current === 'all' ? Infinity : current;
    if (from <= at && (to === Infinity || at < to)) found.push({ from, variant });
  }
  return found.sort((a, b) => a.from - b.from).map((f) => f.variant);
}

/** Merge the variants for one moment. `leave` starts from the final state and moves on from there. */
export function mixVariants(variants: Variants, phase: Phase, current: number | 'all'): Variant {
  if (phase === 'initial') return { ...variants['initial'] };
  const all = phase === 'leave' ? 'all' : current;
  const mixed = Object.assign(
    {},
    variants['initial'],
    variants['enter'],
    ...clickVariants(variants, all),
  );
  return phase === 'leave' ? Object.assign(mixed, variants['leave']) : mixed;
}

/** Every property any variant touches, so a property that is not in `mixed` can be put back to normal. */
export function touchedKeys(variants: Variants): string[] {
  const keys = new Set<string>();
  for (const variant of Object.values(variants))
    for (const k of Object.keys(variant ?? {})) keys.add(k);
  keys.delete('transition');
  return [...keys];
}

/** CSS properties (camelCase) for a variant. Properties it does not set get their normal value. */
export function toStyle(variant: Variant, keys: string[]): Record<string, string> {
  const css: Record<string, string> = {};
  const num = (k: string, fallback: number) => Number(variant[k] ?? fallback);
  if (keys.some((k) => TRANSFORM_KEYS.includes(k))) {
    const scale = num('scale', 1);
    css['transform'] =
      `translate(${num('x', 0)}px, ${num('y', 0)}px) rotate(${num('rotate', 0)}deg) scale(${num('scaleX', scale)}, ${num('scaleY', scale)})`;
  }
  for (const k of keys.filter((k) => !TRANSFORM_KEYS.includes(k))) {
    const v = variant[k];
    if (v == null) css[k] = k === 'opacity' ? '1' : '';
    else css[k] = typeof v === 'number' && !UNITLESS.includes(k) ? `${v}px` : String(v);
  }
  return css;
}

/** The CSS `transition` value: the same time for every touched property, listed for each one. */
export function toTransition(variant: Variant, cssKeys: string[]): string {
  const t = (variant['transition'] ?? {}) as { duration?: number; delay?: number; ease?: string };
  const time = `${t.duration ?? 500}ms ${t.ease ?? 'ease-out'} ${t.delay ?? 0}ms`;
  // One entry per property: in `a, b 500ms` the time belongs to `b` only, and `a` would jump.
  return cssKeys
    .map((k) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} ${time}`)
    .join(', ');
}
