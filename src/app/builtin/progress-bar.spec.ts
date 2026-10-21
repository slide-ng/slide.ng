import { describe, expect, it } from 'vitest';
import { mergeUiText } from '../i18n/ui-text';
import { minutesLabel, minutesText, progressPercent } from './progress-bar';

describe('progressPercent', () => {
  it('goes from 0 on the first slide to 100 on the last', () => {
    expect(progressPercent(1, 5, 0, 0)).toBe(0);
    expect(progressPercent(3, 5, 0, 0)).toBe(50);
    expect(progressPercent(5, 5, 0, 0)).toBe(100);
  });
  it('lets the clicks of a slide fill the way to the next one', () => {
    expect(progressPercent(1, 3, 1, 1)).toBe(25);
    expect(progressPercent(1, 3, 3, 3)).toBe(37.5);
  });
  it('keeps out of range values inside the bar', () => {
    expect(progressPercent(1, 3, 9, 2)).toBeCloseTo(100 / 3);
    expect(progressPercent(0, 3, -1, 2)).toBe(0);
    expect(progressPercent(1, 1, 0, 0)).toBe(100);
  });
});

describe('minutesLabel', () => {
  it('counts the minutes passed on a stopwatch', () => {
    expect(minutesLabel('stopwatch', 600, 59)).toBe('0 min');
    expect(minutesLabel('stopwatch', 600, 125)).toBe('2 min');
  });
  it('counts what is left of a countdown, then how far over it is', () => {
    expect(minutesLabel('countdown', 600, 0)).toBe('10 min left');
    expect(minutesLabel('countdown', 600, 61)).toBe('9 min left');
    expect(minutesLabel('countdown', 600, 601)).toBe('1 min over');
  });
  it('speaks the interface language', () => {
    const tr = minutesText(
      mergeUiText({ 'progress.minutes': '{n} dk', 'progress.minutesLeft': '{n} dk kaldı' }),
    );
    expect(minutesLabel('countdown', 600, 61, tr)).toBe('9 dk kaldı');
    expect(minutesLabel('countdown', 600, 601, tr)).toBe('1 min over'); // not translated: English
  });
  it('takes its words from one table', () => {
    const text = { passed: '{n} dk', left: '{n} dk kaldı', over: '{n} dk geçti' };
    expect(minutesLabel('stopwatch', 600, 125, text)).toBe('2 dk');
    expect(minutesLabel('countdown', 600, 61, text)).toBe('9 dk kaldı');
    expect(minutesLabel('countdown', 600, 601, text)).toBe('1 dk geçti');
  });
});
