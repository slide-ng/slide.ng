import { describe, expect, it } from 'vitest';
import { effectiveMode, modeStep, syncMode, withSyncMode } from './sync-mode';

const all = { viewerSend: true, viewerReceive: true, presenterSend: true, presenterReceive: true };

describe('syncMode', () => {
  it('reads the pair of the window role', () => {
    expect(syncMode(all, false)).toBe('bidirectional');
    expect(syncMode({ ...all, viewerSend: false }, false)).toBe('receive-only');
    expect(syncMode({ ...all, viewerSend: false }, true)).toBe('bidirectional');
    expect(syncMode({ ...all, presenterReceive: false }, true)).toBe('send-only');
    expect(syncMode({ ...all, presenterReceive: false, presenterSend: false }, true)).toBe('off');
  });
});

describe('withSyncMode', () => {
  it('sets the pair of the window role only', () => {
    expect(withSyncMode(all, false, 'receive-only')).toEqual({ ...all, viewerSend: false });
    expect(withSyncMode(all, true, 'send-only')).toEqual({ ...all, presenterReceive: false });
    expect(withSyncMode(all, true, 'off')).toEqual({
      ...all,
      presenterSend: false,
      presenterReceive: false,
    });
  });
  it('goes back to both ways', () => {
    const off = withSyncMode(all, false, 'off');
    expect(withSyncMode(off, false, 'bidirectional')).toEqual(all);
  });
});

describe('modeStep', () => {
  it('moves down and up, and right and left as seen', () => {
    expect(
      ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'a'].map((k) => modeStep(k, false)),
    ).toEqual([1, -1, 1, -1, 0]);
    // Right to left: left is the way the text goes, so it is the next mode.
    expect(
      ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].map((k) => modeStep(k, true)),
    ).toEqual([1, -1, -1, 1]);
  });
});

describe('effectiveMode', () => {
  it('a window that may not send only receives, or does nothing', () => {
    expect(effectiveMode('bidirectional', false)).toBe('receive-only');
    expect(effectiveMode('send-only', false)).toBe('off');
    expect(effectiveMode('receive-only', false)).toBe('receive-only');
    expect(effectiveMode('off', false)).toBe('off');
    expect(effectiveMode('send-only', true)).toBe('send-only');
  });
});
