// The click engine: decides how many clicks a slide has and which one is current.
// It is a port of Slidev's useClicks.ts, using Angular signals instead of Vue refs.
import {
  Injectable,
  InjectionToken,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';

export type RawSingleAt = boolean | number | string | null | undefined;
export type RawAt = RawSingleAt | [RawSingleAt, RawSingleAt];
export type NormSingle = null | number | string;

export interface ClickInfo {
  start: number; // first click where the element is shown
  end: number; // click where it goes away again (Infinity = never)
  max: number; // the slide needs at least this many clicks
  delta: number; // how far this element moves the "relative" position
  isActive: (current: number) => boolean;
  isCurrent: (current: number) => boolean;
}

// "As many clicks as the slide has": asking for this many shows the final state (the slide clamps it).
export const CLICKS_MAX = 999999;

// The first click of a slide. Slides can change it with `clicksStart` frontmatter.
export const CLICKS_START = new InjectionToken<number>('CLICKS_START', { factory: () => 0 });

// `clicks: 4` in the frontmatter fixes the number of clicks, whatever the elements ask for.
export const CLICKS_TOTAL = new InjectionToken<number | null>('CLICKS_TOTAL', {
  factory: () => null,
});

// Port of normalizeSingleAtValue. Result is null (never), "+n"/"-n" (relative) or a number (absolute).
// `slide-ng-click` written without a value arrives as '' - we treat it like "no value", which means '+1'.
export function normalizeSingle(at: RawSingleAt): NormSingle {
  if (at === false || at === 'false') return null;
  if (at == null || at === true || at === 'true' || at === '') return '+1';
  if (typeof at === 'string' && '+-'.includes(at[0])) return at;
  const v = +at;
  if (Number.isNaN(v)) {
    console.error(`Invalid "at" value: ${at}`);
    return null;
  }
  if (v <= 0) {
    console.warn(`[clicks] "at" must be > 0, got ${at}, set to 1`);
    return 1;
  }
  return v;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Per-slide clicks state. The generated slide provides it, so every slide has its own. */
@Injectable()
export class ClicksContext {
  readonly clicksStart = inject(CLICKS_START);
  private totalOverride = inject(CLICKS_TOTAL);
  // One entry per element that takes part in clicks (the element itself is the key).
  private relativeSizeMap = new Map<unknown, number>();
  private maxMap = new Map<unknown, number>();
  private raw = signal(this.clicksStart);
  readonly mounted = signal(false);
  private maxes = signal<number[]>([]); // signals cannot watch a Map, so we publish a copy
  // Elements that can work out their clicks again, to put them in document order when the slide mounts.
  private placers = new Map<unknown, { el: Element; place: () => void }>();

  /** Like Slidev: 0 until the slide is mounted, then the biggest registered max (or the frontmatter override). */
  readonly total = computed(
    () => this.totalOverride ?? (this.mounted() ? Math.max(0, ...this.maxes()) : 0),
  );
  /** The current click, always between clicksStart and total. */
  readonly current = computed(() => clamp(+this.raw(), this.clicksStart, this.total()));

  constructor() {
    afterNextRender(() => {
      this.inDocumentOrder();
      this.publish();
      this.mounted.set(true);
    });
  }

  private publish() {
    this.maxes.set([...this.maxMap.values()]);
  }

  // Before mount the total is unknown, so the value is stored unclamped (like Slidev's setter).
  setCurrent(v: number) {
    this.raw.set(this.mounted() ? clamp(v, this.clicksStart, this.total()) : v);
  }
  next() {
    this.setCurrent(this.current() + 1);
  }
  prev() {
    this.setCurrent(this.current() - 1);
  }

  /** Sum of all relative steps registered so far; "+1" is added on top of this. */
  get currentOffset() {
    let sum = 0;
    for (const v of this.relativeSizeMap.values()) sum += v;
    return sum;
  }

  /** Shown from one click on and stays shown. `size` is how many clicks it spans. */
  calculateSince(rawAt: RawSingleAt, size = 1): ClickInfo | null {
    const at = normalizeSingle(rawAt);
    if (at == null) return null;
    let start: number, max: number, delta: number;
    if (typeof at === 'string') {
      const v = +at,
        offset = this.currentOffset;
      start = offset + v;
      max = offset + v + size - 1;
      delta = v + size - 1;
    } else {
      start = at;
      max = at + size - 1;
      delta = 0;
    }
    return {
      start,
      end: Infinity,
      max,
      delta,
      isActive: (c) => c >= start,
      isCurrent: (c) => c === start,
    };
  }

  /** Shown only from `start` up to (not including) `end`. */
  calculateRange(rawAt: RawAt): ClickInfo | null {
    if (!Array.isArray(rawAt)) return null;
    const a = normalizeSingle(rawAt[0])!,
      b = normalizeSingle(rawAt[1])!;
    let start: number, end: number, delta: number;
    if (typeof a === 'string') {
      start = this.currentOffset + +a;
      delta = +a;
    } else {
      start = a;
      delta = 0;
    }
    if (typeof b === 'string') {
      end = start + +b;
      delta += +b;
    } else end = b;
    return {
      start,
      end,
      max: end,
      delta,
      isActive: (c) => start <= c && c < end,
      isCurrent: (c) => c === start,
    };
  }

  calculate(at: RawAt) {
    return Array.isArray(at) ? this.calculateRange(at) : this.calculateSince(at);
  }

  register(key: unknown, info: Pick<ClickInfo, 'delta' | 'max'> | null) {
    if (!info) return;
    this.relativeSizeMap.set(key, info.delta);
    this.maxMap.set(key, info.max);
    if (this.mounted()) this.publish(); // an element added later (inside @if) still counts
  }

  /** `place` registers the element again; it lets the clicks be renumbered in document order when the slide mounts. */
  track(key: unknown, el: Element, place: () => void) {
    this.placers.set(key, { el, place });
  }

  // ngOnInit runs for the slide's own template before the views of the components in it, so clicks inside a component
  // register after the slide's later clicks. Slidev numbers them in document order; do the same once everything is there.
  // Only when every registered element can be placed again (otherwise the arrival order is kept).
  private inDocumentOrder() {
    const keys = [...this.relativeSizeMap.keys()];
    if (keys.length < 2 || keys.some((k) => !this.placers.has(k))) return;
    const el = (k: unknown) => this.placers.get(k)!.el;
    const sorted = [...keys].sort((a, b) =>
      el(a).compareDocumentPosition(el(b)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
    if (sorted.every((k, i) => k === keys[i])) return;
    this.relativeSizeMap.clear();
    this.maxMap.clear();
    for (const k of sorted) this.placers.get(k)!.place();
  }

  unregister(key: unknown) {
    this.placers.delete(key);
    this.relativeSizeMap.delete(key);
    this.maxMap.delete(key);
    if (this.mounted()) this.publish();
  }
}
