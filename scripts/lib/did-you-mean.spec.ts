import { describe, expect, it } from 'vitest';
import { didYouMean, nearest } from './did-you-mean.mjs';

describe('nearest', () => {
  it('finds a name one or two letters away, swapped letters too', () => {
    expect(nearest('covr', ['cover', 'center', 'default'])).toBe('cover');
    expect(nearest('image-rigth', ['image-right', 'image-left'])).toBe('image-right');
    expect(nearest('slide-ng-tocc', ['slide-ng-toc', 'slide-ng-total'])).toBe('slide-ng-toc');
  });
  it('gives nothing for a name that is not close, or that is already right', () => {
    expect(nearest('fancy', ['cover', 'center', 'default'])).toBeUndefined();
    expect(nearest('cover', ['cover'])).toBeUndefined();
  });
});

describe('didYouMean', () => {
  it('writes the suggestion, or nothing', () => {
    expect(didYouMean('biuld', ['build', 'dev'])).toBe(' Did you mean "build"?');
    expect(didYouMean('ouput', ['output'], (n) => `--${n}`)).toBe(' Did you mean --output?');
    expect(didYouMean('zzz', ['build'])).toBe('');
  });
});
