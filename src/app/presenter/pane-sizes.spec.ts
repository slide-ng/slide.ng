import { describe, expect, it } from 'vitest';
import { clampRows, clampWidth, paneSizeOf, resizers } from './pane-sizes';

describe('clampWidth', () => {
  it('keeps the notes between 240 and 720 px and at most 70% of the grid', () => {
    expect(clampWidth(100, 2000)).toBe(240);
    expect(clampWidth(900, 2000)).toBe(720);
    expect(clampWidth(600, 600)).toBe(420);
    expect(clampWidth(500.4, 2000)).toBe(500);
    expect(clampWidth(NaN, 2000)).toBe(240);
  });
  it('never goes under the minimum on a small page', () => {
    expect(clampWidth(300, 200)).toBe(240);
  });
});

describe('clampRows', () => {
  it('keeps the row at least 160 px and at most 75% of the grid', () => {
    expect(clampRows(50, 800)).toBe(160);
    expect(clampRows(700, 800)).toBe(600);
    expect(clampRows(300, 800)).toBe(300);
  });
});

describe('paneSizeOf', () => {
  it('reads one layout and fills in the defaults', () => {
    expect(paneSizeOf({ 2: { width: 400, rows: 300 } }, 2)).toEqual({ width: 400, rows: 300 });
    expect(paneSizeOf({ 2: { width: 400 } }, 1)).toEqual({ width: 360, rows: 280 });
    expect(paneSizeOf({ 3: { width: 'x', rows: -1 } }, 3)).toEqual({ width: 360, rows: 280 });
    expect(paneSizeOf(null, 1)).toEqual({ width: 360, rows: 280 });
  });
});

describe('resizers', () => {
  it('has no handles in layout 1 on a tall narrow page', () => {
    expect(resizers(1, false, true)).toMatchObject({ width: false, rows: false });
  });
  it('puts the notes on the right in layout 1 on a wide page', () => {
    expect(resizers(1, true, false)).toMatchObject({ width: true, notesOnRight: true });
    expect(resizers(2, true, false)).toMatchObject({ width: true, notesOnRight: false });
  });
});
