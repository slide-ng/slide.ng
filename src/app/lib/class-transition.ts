// A slide transition written as CSS classes, as Vue's <Transition> runs it (Slidev's custom transitions): the entering slide gets
// `<name>-enter-from` and `-enter-active`, a frame later `-enter-to` instead of `-enter-from`; the leaving one the same with
// `leave`. Each side ends on its `transitionend` / `animationend`, or at once when its classes animate nothing.
import { ResolvedTransition, transitionClasses } from './transitions';

export interface Running {
  /** Both slides are done (or the transition was cut short). */
  readonly finished: Promise<void>;
  /** Stop now: the classes are removed and `finished` resolves. */
  cancel(): void;
}

/** Vue's nextFrame: two animation frames, so the first classes are drawn before the second ones are set. */
function nextFrame(run: () => void): () => void {
  let second = 0;
  const first = requestAnimationFrame(() => (second = requestAnimationFrame(run)));
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}

/** The longest CSS transition or animation on an element, as Vue's getTransitionInfo: its event and how many to wait for. */
export function transitionInfo(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): {
  type: 'transition' | 'animation' | null;
  timeout: number;
  count: number;
} {
  const list = (name: string) => (style.getPropertyValue(name) || '').split(', ');
  const longest = (delays: string[], durations: string[]) =>
    Math.max(0, ...durations.map((d, i) => seconds(d) + seconds(delays[i % delays.length])));
  const transitionDurations = list('transition-duration');
  const animationDurations = list('animation-duration');
  const transition = longest(list('transition-delay'), transitionDurations);
  const animation = longest(list('animation-delay'), animationDurations);
  const timeout = Math.max(transition, animation);
  if (timeout <= 0) return { type: null, timeout: 0, count: 0 };
  const type = transition >= animation ? 'transition' : 'animation';
  return {
    type,
    timeout,
    count: (type === 'transition' ? transitionDurations : animationDurations).length,
  };
}

// `0.5s` or `300ms` in milliseconds.
function seconds(value = ''): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return 0;
  return value.trim().endsWith('ms') ? n : n * 1000;
}

/** Runs one side: `from` and `active` now, `to` instead of `from` a frame later, then waits for the end. */
function runSide(
  element: HTMLElement,
  from: string,
  active: string,
  to: string,
  explicit: number | undefined,
): Running {
  const add = (c: string) => c && element.classList.add(...c.split(/\s+/).filter(Boolean));
  const remove = (c: string) => c && element.classList.remove(...c.split(/\s+/).filter(Boolean));
  let done = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopFrame = () => {};
  let onEnd: (e: Event) => void = () => {};
  let resolve!: () => void;
  const finished = new Promise<void>((r) => (resolve = r));
  const end = () => {
    if (done) return;
    done = true;
    stopFrame();
    clearTimeout(timer);
    element.removeEventListener('transitionend', onEnd);
    element.removeEventListener('animationend', onEnd);
    remove(from);
    remove(to);
    remove(active);
    resolve();
  };

  add(from);
  add(active);
  stopFrame = nextFrame(() => {
    remove(from);
    add(to);
    if (explicit != null) {
      timer = setTimeout(end, explicit);
      return;
    }
    const info = transitionInfo(getComputedStyle(element));
    if (!info.type) return end(); // the classes animate nothing (no CSS for this name)
    let ended = 0;
    onEnd = (e: Event) => {
      if (e.target === element && ++ended >= info.count) end();
    };
    element.addEventListener(`${info.type}end`, onEnd);
    timer = setTimeout(end, info.timeout + 1); // an event that never comes (the element was hidden)
  });
  return { finished, cancel: end };
}

/** Plays a class transition between the leaving and the entering slide. */
export function classTransition(
  entering: HTMLElement,
  leaving: HTMLElement,
  t: ResolvedTransition,
): Running {
  const c = transitionClasses(t);
  const duration = t.duration;
  const enterMs = typeof duration === 'number' ? duration : duration?.enter;
  const leaveMs = typeof duration === 'number' ? duration : duration?.leave;
  const leave = runSide(leaving, c.leaveFromClass, c.leaveActiveClass, c.leaveToClass, leaveMs);
  const enter = runSide(entering, c.enterFromClass, c.enterActiveClass, c.enterToClass, enterMs);
  return {
    finished: Promise.all([enter.finished, leave.finished]).then(() => {}),
    cancel() {
      enter.cancel();
      leave.cancel();
    },
  };
}
