import {
  animationsFor,
  isClassTransition,
  pickTransition,
  resolveTransition,
  transitionClasses,
} from './transitions';

const name = (t: { name: string } | null) => t?.name ?? null;

describe('resolveTransition', () => {
  it('turns a one-word name into forward and backward variants', () => {
    expect(name(resolveTransition('slide-left', false))).toBe('slide-left');
    expect(name(resolveTransition('slide-left', true))).toBe('slide-right');
    expect(name(resolveTransition('slide-up', true))).toBe('slide-down');
    expect(name(resolveTransition('slide-down', false))).toBe('slide-down');
  });
  it('leaves fade and view-transition the same in both directions', () => {
    expect(name(resolveTransition('fade', true))).toBe('fade');
    expect(name(resolveTransition('view-transition', true))).toBe('view-transition');
  });
  it('accepts "forward | backward" and the object form', () => {
    expect(name(resolveTransition('fade | slide-up', false))).toBe('fade');
    expect(name(resolveTransition('fade | slide-up', true))).toBe('slide-up');
    expect(name(resolveTransition({ name: 'slide-right' }, true))).toBe('slide-left');
  });
  it('gives null for nothing', () => {
    expect(resolveTransition(undefined, false)).toBeNull();
    expect(resolveTransition(null, false)).toBeNull();
    expect(resolveTransition({}, false)).toBeNull();
  });
  it('keeps the other keys of the object form', () => {
    expect(resolveTransition({ name: 'zoom | fade', duration: 300 }, false)).toEqual({
      name: 'zoom',
      duration: 300,
    });
  });
});

describe('class transitions', () => {
  it('are used for a name that is not built in, or an object with class names', () => {
    expect(isClassTransition({ name: 'my-fade' })).toBe(true);
    expect(isClassTransition({ name: 'fade', enterActiveClass: 'in' })).toBe(true);
    expect(isClassTransition({ name: 'fade' })).toBe(false);
    expect(isClassTransition({ name: 'slide-left' })).toBe(false);
    expect(isClassTransition({ name: 'view-transition' })).toBe(false);
  });
  it("have Vue's class names, unless the object names others", () => {
    expect(transitionClasses({ name: 'zoom', leaveToClass: 'gone' })).toEqual({
      enterFromClass: 'zoom-enter-from',
      enterActiveClass: 'zoom-enter-active',
      enterToClass: 'zoom-enter-to',
      leaveFromClass: 'zoom-leave-from',
      leaveActiveClass: 'zoom-leave-active',
      leaveToClass: 'gone',
    });
  });
});

describe('pickTransition', () => {
  const slides = [
    { transition: null },
    { transition: 'slide-left' },
    { transition: 'fade' },
    { transition: null },
  ];
  it('uses the setting of the earlier slide, in both directions', () => {
    expect(name(pickTransition(slides, 2, 3, null))).toBe('slide-left');
    expect(name(pickTransition(slides, 3, 2, null))).toBe('slide-right');
    expect(name(pickTransition(slides, 3, 4, null))).toBe('fade');
  });
  it('falls back to the deck default, and to nothing', () => {
    expect(name(pickTransition(slides, 1, 2, 'fade'))).toBe('fade');
    expect(pickTransition(slides, 1, 2, null)).toBeNull();
    expect(pickTransition(slides, 2, 2, 'fade')).toBeNull();
  });
});

describe('animationsFor', () => {
  it('moves slide-left in from the right and the old one out to the left', () => {
    const a = animationsFor('slide-left', 500)!;
    expect(a.enter[0]).toEqual({ translate: '100% 0' });
    expect(a.leave[1]).toEqual({ translate: '-100% 0' });
  });
  it('delays the entering slide for fade-out', () => {
    const a = animationsFor('fade-out', 500)!;
    expect(a.enterOptions).toMatchObject({ delay: 300, duration: 400 });
    expect(a.leaveOptions).toMatchObject({ duration: 300 });
  });
  it('knows no animation for view-transition or a made-up name', () => {
    expect(animationsFor('view-transition', 500)).toBeNull();
    expect(animationsFor('nope', 500)).toBeNull();
  });
});
