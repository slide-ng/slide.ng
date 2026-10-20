import { preloadAhead, preloadWindow } from './preload-images';

describe('preloadAhead', () => {
  it('is 3 by default, n for { ahead: n } (0 too), and off for false', () => {
    expect(preloadAhead(undefined)).toBe(3);
    expect(preloadAhead(true)).toBe(3);
    expect(preloadAhead({ ahead: 5 })).toBe(5);
    expect(preloadAhead({ ahead: 0 })).toBe(0);
    expect(preloadAhead({ ahead: 2.7 })).toBe(2);
    expect(preloadAhead({})).toBe(3);
    expect(preloadAhead({ ahead: '5' })).toBe(3);
    expect(preloadAhead({ ahead: -1 })).toBe(3);
    expect(preloadAhead(false)).toBeNull();
  });
});

describe('preloadWindow', () => {
  it('takes the slide on screen, the one before and the next ones, inside the deck', () => {
    expect(preloadWindow(4, 10, 3)).toEqual([4, 3, 5, 6, 7]);
    expect(preloadWindow(1, 10, 2)).toEqual([1, 2, 3]);
    expect(preloadWindow(9, 10, 3)).toEqual([9, 8, 10]);
  });
});
