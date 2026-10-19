import { describe, expect, it } from 'vitest';
import { readProgressBar } from './deck-progress-bar';

describe('readProgressBar', () => {
  it('is off unless true or an object', () => {
    expect(readProgressBar(undefined)).toBeNull();
    expect(readProgressBar(false)).toBeNull();
    expect(readProgressBar('top')).toBeNull();
    expect(readProgressBar([1])).toBeNull();
  });
  it('gives the defaults for true', () => {
    expect(readProgressBar(true)).toEqual({
      position: 'bottom',
      height: 4,
      color: '',
      track: 'transparent',
      clicks: true,
      minutes: false,
    });
  });
  it('reads the options and drops wrong values', () => {
    expect(
      readProgressBar({ position: 'top', height: 8, color: 'red', clicks: false, minutes: true }),
    ).toMatchObject({ position: 'top', height: 8, color: 'red', clicks: false, minutes: true });
    expect(readProgressBar({ position: 'left', height: -2, color: 3 })).toMatchObject({
      position: 'bottom',
      height: 4,
      color: '',
    });
  });
});
