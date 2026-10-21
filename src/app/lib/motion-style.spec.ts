import { mixVariants, toStyle, toTransition, touchedKeys } from './motion-style';

const v = {
  initial: { x: -80, opacity: 0 },
  enter: { x: 0, opacity: 1 },
  'click-1': { y: 30 },
  'click-2': { y: 60 },
  'click-2-4': { x: 40 },
  leave: { x: 80 },
};

describe('mixVariants', () => {
  it('initial is just initial', () => {
    expect(mixVariants(v, 'initial', 5)).toEqual({ x: -80, opacity: 0 });
  });
  it('enter adds the click variants that are active', () => {
    expect(mixVariants(v, 'enter', 0)).toEqual({ x: 0, opacity: 1 });
    expect(mixVariants(v, 'enter', 1)).toEqual({ x: 0, opacity: 1, y: 30 });
    expect(mixVariants(v, 'enter', 2)).toEqual({ x: 40, opacity: 1, y: 60 }); // later click wins, range is active
    expect(mixVariants(v, 'enter', 4)).toEqual({ x: 0, opacity: 1, y: 60 }); // the range end is exclusive
  });
  it('the final state (print, overview) leaves out a range that has ended', () => {
    expect(mixVariants(v, 'enter', 'all')).toEqual({ x: 0, opacity: 1, y: 60 });
  });
  it('leave starts from the final state and applies leave on top', () => {
    expect(mixVariants(v, 'leave', 0)).toEqual({ x: 80, opacity: 1, y: 60 });
  });
});

describe('toStyle', () => {
  const keys = touchedKeys(v);
  it('collects every touched key but transition', () => {
    expect(keys.sort()).toEqual(['opacity', 'x', 'y']);
  });
  it('builds one transform, with defaults for what is not set', () => {
    expect(toStyle({ x: 10 }, keys)).toEqual({
      transform: 'translate(10px, 0px) rotate(0deg) scale(1, 1)',
      opacity: '1',
    });
  });
  it('supports scale, scaleX and rotate', () => {
    const css = toStyle({ scale: 2, scaleY: 3, rotate: 45 }, ['scale', 'scaleY', 'rotate']);
    expect(css['transform']).toBe('translate(0px, 0px) rotate(45deg) scale(2, 3)');
  });
  it('passes other CSS properties through, numbers become px', () => {
    expect(
      toStyle({ width: 50, color: 'red', zIndex: 3 }, ['width', 'color', 'zIndex', 'height']),
    ).toEqual({ width: '50px', color: 'red', zIndex: '3', height: '' });
  });
});

describe('toTransition', () => {
  it('uses the transition of the variant, with defaults', () => {
    expect(toTransition({}, ['transform', 'backgroundColor'])).toBe(
      'transform 500ms ease-out 0ms, background-color 500ms ease-out 0ms',
    );
    expect(toTransition({}, [])).toBe('');
    expect(
      toTransition({ transition: { duration: 200, delay: 50, ease: 'linear' } }, ['opacity']),
    ).toBe('opacity 200ms linear 50ms');
  });
});
