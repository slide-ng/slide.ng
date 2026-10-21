import {
  preloadAhead,
  preloadImage,
  preloadWindow,
  progressOf,
  slowConnection,
} from './preload-images';

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

describe('preloadImage', () => {
  // Pictures that never finish unless the test says so; `started` lists them in the order they were asked for.
  const started: FakeImage[] = [];
  class FakeImage {
    url = '';
    onload?: () => void;
    onerror?: () => void;
    set src(src: string) {
      this.url = src;
      started.push(this);
    }
  }
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('Image', FakeImage);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const names = () => started.map((i) => i.url.split('/').pop());

  it('loads two at a time, and a retried picture of the current slides goes before the rest of the deck', () => {
    preloadImage('/q/near.png', true);
    preloadImage('/q/other.png', true);
    for (const n of ['a', 'b', 'c']) preloadImage(`/q/deck-${n}.png`);
    expect(names()).toEqual(['near.png', 'other.png']);
    started[0].onerror!(); // near.png failed: it is tried again a second later
    expect(names()).toEqual(['near.png', 'other.png', 'deck-a.png']);
    vi.advanceTimersByTime(1000);
    started[1].onload!(); // a place is free: the retry of near.png comes before deck-b and deck-c
    expect(names().slice(3)).toEqual(['near.png']);
  });
});
