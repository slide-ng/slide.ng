// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { addressMode, buildOptions, checkRouterMode } from './build-options.mjs';

describe('router mode of a build', () => {
  it('reads --router-mode from the environment, or nothing', () => {
    expect(buildOptions({ SLIDE_NG_ROUTER_MODE: 'memory' }).routerMode).toBe('memory');
    expect(buildOptions({ SLIDE_NG_ROUTER_MODE: '' }).routerMode).toBeNull();
    expect(buildOptions({}).routerMode).toBeNull();
  });
  it('accepts history, hash and memory', () => {
    for (const mode of ['history', 'hash', 'memory']) expect(checkRouterMode(mode)).toBe(mode);
    expect(checkRouterMode(undefined)).toBeUndefined();
    expect(() => checkRouterMode('abstract')).toThrow(/history, hash, memory/);
  });
  it('opens a memory-routed deck with history addresses for export', () => {
    expect(addressMode({ routerMode: 'memory' })).toBe('history');
    expect(addressMode({ routerMode: 'hash' })).toBe('hash');
    expect(addressMode({})).toBe('history');
  });
});
