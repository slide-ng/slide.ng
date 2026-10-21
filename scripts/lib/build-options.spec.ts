// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  addressMode,
  buildOptions,
  builtRouterMode,
  checkRouterMode,
  modeSwitch,
  offlineRouterWarning,
} from './build-options.mjs';

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
  it('reads the router mode a build was made with from its index.html', () => {
    expect(
      builtRouterMode('<head><meta name="slide-ng-router-mode" content="memory"></head>'),
    ).toBe('memory');
    expect(builtRouterMode('<head><title>x</title></head>')).toBeNull();
    expect(
      builtRouterMode('<head><meta name="slide-ng-router-mode" content="abstract"></head>'),
    ).toBeNull();
  });
  it("says when an offline build replaces the headmatter's memory routing with hash routing", () => {
    expect(offlineRouterWarning({ routerMode: 'memory' })).toMatch(
      /routerMode: memory is not used/,
    );
    expect(offlineRouterWarning({ routerMode: 'hash' })).toBeNull();
    expect(offlineRouterWarning({})).toBeNull();
  });
});

describe('modeSwitch', () => {
  it('is on when not set', () => {
    expect(modeSwitch(undefined, true)).toBe(true);
    expect(modeSwitch(undefined, false)).toBe(true);
  });
  it('follows true and false', () => {
    expect(modeSwitch(true, false)).toBe(true);
    expect(modeSwitch(false, true)).toBe(false);
  });
  it('dev and build turn it on in that mode only', () => {
    expect(modeSwitch('dev', true)).toBe(true);
    expect(modeSwitch('dev', false)).toBe(false);
    expect(modeSwitch('build', false)).toBe(true);
    expect(modeSwitch('build', true)).toBe(false);
  });
});

describe('buildOptions', () => {
  it('is in dev mode only when slide-ng dev says so', () => {
    expect(buildOptions({ SLIDE_NG_DEV: '1' }).dev).toBe(true);
    expect(buildOptions({}).dev).toBe(false);
    expect(buildOptions({ SLIDE_NG_BUILD: '1' }).dev).toBe(false);
  });
});
