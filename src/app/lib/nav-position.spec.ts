import { describe, expect, it } from 'vitest';
import {
  NAV_POSITIONS,
  deckNavPosition,
  isNavPosition,
  navPosition,
  navPositionAt,
  navPositionStep,
  readNavPosition,
} from './nav-position';

describe('readNavPosition', () => {
  it('is the bottom left when not set, as in Slidev', () => {
    expect(readNavPosition(undefined)).toEqual({ edge: 'bottom', side: 'start' });
  });
  it('reads the edge and the side, left and right as start and end', () => {
    expect(readNavPosition('top-right')).toEqual({ edge: 'top', side: 'end' });
    expect(readNavPosition('bottom-center')).toEqual({ edge: 'bottom', side: 'center' });
    expect(readNavPosition('top-left')).toEqual({ edge: 'top', side: 'start' });
  });
  it('keeps the bottom left for a value not in the list', () => {
    for (const v of ['top', 'right', 'Top-Right', 'top-middle', 1, true, { edge: 'top' }])
      expect(readNavPosition(v)).toEqual({ edge: 'bottom', side: 'start' });
  });
});

describe('navPosition', () => {
  it("follows the viewer's choice over the deck's own place", () => {
    expect(navPosition('top-center')).toEqual({ edge: 'top', side: 'center' });
  });
  it("is the deck's own place without a choice, or with one that is not a place", () => {
    const own = readNavPosition(deckNavPosition());
    for (const v of [null, undefined, 'middle', 3]) expect(navPosition(v)).toEqual(own);
  });
  it('knows the six places', () => {
    expect(NAV_POSITIONS.filter(isNavPosition)).toHaveLength(6);
    expect(isNavPosition('top')).toBe(false);
  });
});

describe('navPositionStep', () => {
  it('moves through the 2 x 3 grid and stops at its edges', () => {
    expect(navPositionStep('bottom-left', 'ArrowRight', false)).toBe('bottom-center');
    expect(navPositionStep('bottom-center', 'ArrowUp', false)).toBe('top-center');
    expect(navPositionStep('top-right', 'ArrowDown', false)).toBe('bottom-right');
    expect(navPositionStep('top-right', 'ArrowRight', false)).toBe('top-right');
    expect(navPositionStep('top-left', 'ArrowUp', false)).toBe('top-left');
  });
  it('mirrors left and right in a right-to-left page', () => {
    // There `left` is the start, drawn on the right: ArrowLeft goes towards `right`.
    expect(navPositionStep('bottom-left', 'ArrowLeft', true)).toBe('bottom-center');
    expect(navPositionStep('bottom-center', 'ArrowRight', true)).toBe('bottom-left');
  });
  it('is null for another key', () => {
    expect(navPositionStep('top-left', 'Enter', false)).toBeNull();
  });
});

describe('navPositionAt', () => {
  it('is the cell of the 2 x 3 grid under the point', () => {
    expect(navPositionAt(10, 10, 900, 600, false)).toBe('top-left');
    expect(navPositionAt(450, 590, 900, 600, false)).toBe('bottom-center');
    expect(navPositionAt(899, 300, 900, 600, false)).toBe('bottom-right');
  });
  it('mirrors the columns in a right-to-left page', () => {
    expect(navPositionAt(10, 10, 900, 600, true)).toBe('top-right');
    expect(navPositionAt(890, 500, 900, 600, true)).toBe('bottom-left');
  });
  it('is null outside the page', () => {
    expect(navPositionAt(-1, 10, 900, 600, false)).toBeNull();
    expect(navPositionAt(10, 600, 900, 600, false)).toBeNull();
  });
});
