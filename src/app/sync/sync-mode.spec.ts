import { describe, expect, it } from 'vitest';
import { syncMode, withSyncMode } from './sync-mode';

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
