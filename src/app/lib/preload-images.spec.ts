import { preloadAhead, preloadWindow, progressOf, slowConnection } from './preload-images';

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

describe('progressOf', () => {
  it('counts the pictures that are done, failed ones too, and stops at 1', () => {
    expect(progressOf(0, 4, true)).toBe(0);
    expect(progressOf(3, 4, true)).toBe(0.75);
    expect(progressOf(4, 4, true)).toBe(1);
    expect(progressOf(5, 4, true)).toBe(1);
  });
  it('is complete without pictures, and when preloadImages is false', () => {
    expect(progressOf(0, 0, true)).toBe(1);
    expect(progressOf(0, 4, false)).toBe(1);
  });
});

describe('slowConnection', () => {
  it('is true when the browser asks to save data or the connection is 2g or 3g', () => {
    expect(slowConnection({ saveData: true, effectiveType: '4g' })).toBe(true);
    expect(slowConnection({ effectiveType: '3g' })).toBe(true);
    expect(slowConnection({ effectiveType: 'slow-2g' })).toBe(true);
    expect(slowConnection({ effectiveType: '4g' })).toBe(false);
    expect(slowConnection(undefined)).toBe(false); // a browser without navigator.connection
  });
});
