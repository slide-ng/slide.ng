import { buildOptions, modeSwitch } from './build-options.mjs';

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
