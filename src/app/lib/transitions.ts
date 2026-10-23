// Slide transitions. Slidev uses Vue's <Transition> and CSS classes; here the two slides
// (the one leaving and the one entering) are animated with the browser's Web Animations API for the built-in names.
// Any other name, or an object with class names, runs Vue's class sequence (class-transition.ts) with the deck's own CSS.

/** The object form, as Vue's TransitionGroupProps: a name and, if wanted, other class names and a fixed duration. */
export interface TransitionObject {
  name?: string;
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  duration?: number | { enter: number; leave: number };
}
export type TransitionSpec = string | TransitionObject | null | undefined;
/** A transition for one direction: the name is known. */
export type ResolvedTransition = TransitionObject & { name: string };

// Slidev's table: a one-word name stands for "forward | backward".
const PAIRS: Record<string, string> = {
  'slide-left': 'slide-left | slide-right',
  'slide-right': 'slide-right | slide-left',
  'slide-up': 'slide-up | slide-down',
  'slide-down': 'slide-down | slide-up',
};

/** The transition to use for this direction, or null for none. Port of Slidev's resolveTransition. */
export function resolveTransition(
  spec: TransitionSpec,
  backward: boolean,
): ResolvedTransition | null {
  const options = typeof spec === 'string' ? { name: spec } : spec;
  const wanted = options?.name?.trim();
  if (!wanted) return null;
  const pair = wanted.includes('|') ? wanted : (PAIRS[wanted] ?? wanted);
  let name = pair;
  if (pair.includes('|')) {
    const [forward, back] = pair.split('|').map((s) => s.trim());
    name = backward ? back : forward;
  }
  return name ? { ...options, name } : null;
}

/**
 * Which transition applies between two slides. Like Slidev, the one set on the earlier
 * slide counts (going on from slide 3 to 4, and back from 4 to 3, both use slide 3's setting).
 */
export function pickTransition(
  slides: { transition: TransitionSpec }[],
  from: number,
  to: number,
  deckDefault: TransitionSpec,
): ResolvedTransition | null {
  if (from === to) return null;
  const earlier = slides[Math.min(from, to) - 1]?.transition ?? deckDefault;
  return resolveTransition(earlier, to < from);
}

const CLASS_KEYS = [
  'enterFromClass',
  'enterActiveClass',
  'enterToClass',
  'leaveFromClass',
  'leaveActiveClass',
  'leaveToClass',
] as const;

/** Whether the transition runs on CSS classes: a name with no built-in animation, or an object that names its own classes. */
export function isClassTransition(t: ResolvedTransition): boolean {
  if (t.name === 'view-transition') return false;
  return !animationsFor(t.name, 0) || CLASS_KEYS.some((key) => typeof t[key] === 'string');
}

/** Vue's class names for a transition: `<name>-enter-from` and so on, unless the object names others. */
export function transitionClasses(
  t: ResolvedTransition,
): Record<(typeof CLASS_KEYS)[number], string> {
  const [enterFrom, enterActive, enterTo, leaveFrom, leaveActive, leaveTo] = [
    'enter-from',
    'enter-active',
    'enter-to',
    'leave-from',
    'leave-active',
    'leave-to',
  ].map((part, i) => t[CLASS_KEYS[i]] ?? `${t.name}-${part}`);
  return {
    enterFromClass: enterFrom,
    enterActiveClass: enterActive,
    enterToClass: enterTo,
    leaveFromClass: leaveFrom,
    leaveActiveClass: leaveActive,
    leaveToClass: leaveTo,
  };
}

interface Pair {
  enter: Keyframe[];
  leave: Keyframe[];
  enterOptions?: KeyframeAnimationOptions;
  leaveOptions?: KeyframeAnimationOptions;
}

// What each transition does, written from Slidev's transitions.css. `ms` is the duration.
export function animationsFor(name: string, ms: number): Pair | null {
  const slide = (from: string, to: string): Pair => ({
    enter: [{ translate: from }, { translate: '0 0' }],
    leave: [{ translate: '0 0' }, { translate: to }],
  });
  switch (name) {
    case 'slide-left':
      return slide('100% 0', '-100% 0');
    case 'slide-right':
      return slide('-100% 0', '100% 0');
    case 'slide-up':
      return slide('0 100%', '0 -100%');
    case 'slide-down':
      return slide('0 -100%', '0 100%');
    case 'fade':
      return { enter: [{ opacity: 0 }, { opacity: 1 }], leave: [{ opacity: 1 }, { opacity: 0 }] };
    case 'fade-out': // the old slide fades out first, then the new one fades in
      return {
        enter: [{ opacity: 0 }, { opacity: 1 }],
        leave: [{ opacity: 1 }, { opacity: 0 }],
        enterOptions: { duration: ms * 0.8, delay: ms * 0.6, easing: 'ease-in' },
        leaveOptions: { duration: ms * 0.6, easing: 'ease-out' },
      };
    default:
      return null;
  }
}

/** The duration from the CSS variable `--slidev-transition-duration` (like `0.5s`), in milliseconds. */
export function transitionDuration(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--slidev-transition-duration')
    .trim();
  const n = parseFloat(raw);
  return Number.isNaN(n) ? 500 : raw.endsWith('ms') ? n : n * 1000;
}
