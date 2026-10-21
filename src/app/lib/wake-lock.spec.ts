import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { IN_FRAME, WakeLock, inFrame } from './wake-lock';

describe('WakeLock', () => {
  let requests = 0;
  beforeEach(() => {
    requests = 0;
    localStorage.clear();
    const sentinel = { release: async () => {}, addEventListener: () => {} };
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => (requests++, sentinel) },
    });
  });
  afterEach(() => {
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  const start = (framed: boolean) => {
    TestBed.configureTestingModule({ providers: [{ provide: IN_FRAME, useValue: framed }] });
    const lock = TestBed.inject(WakeLock);
    TestBed.tick();
    return lock;
  };

  it('lets go of a lock that arrives after the setting was switched off', async () => {
    let released = 0;
    let answer!: (s: unknown) => void;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => new Promise((r) => (answer = r)) },
    });
    const lock = TestBed.inject(WakeLock);
    lock.enabled.set(true);
    TestBed.tick();
    lock.enabled.set(false);
    TestBed.tick();
    answer({ addEventListener() {}, release: async () => released++ });
    await new Promise((r) => setTimeout(r, 0));
    expect(released).toBe(1);
    expect(lock.held()).toBe(false);
    delete (navigator as { wakeLock?: unknown }).wakeLock;
  });

  it('asks for the lock at once in a page of its own', () => {
    expect(start(false).supported).toBe(true);
    expect(requests).toBe(1);
  });

  it('in an iframe, waits until the reader uses the deck', () => {
    start(true);
    expect(requests).toBe(0);
    document.dispatchEvent(new Event('pointerdown'));
    TestBed.tick();
    expect(requests).toBe(1);
  });

  it('in an iframe, full screen counts as using the deck', () => {
    start(true);
    document.dispatchEvent(new Event('fullscreenchange'));
    TestBed.tick();
    expect(requests).toBe(1);
  });
});

describe('inFrame', () => {
  it('is false for a top window and true inside a frame, also one that may not be read', () => {
    const top = {} as Window;
    expect(inFrame({ self: top, top } as unknown as Window)).toBe(false);
    expect(inFrame({ self: {}, top } as unknown as Window)).toBe(true);
    const foreign = {
      self: {},
      get top(): Window {
        throw new Error('cross-origin');
      },
    };
    expect(inFrame(foreign as unknown as Window)).toBe(true);
  });
});
