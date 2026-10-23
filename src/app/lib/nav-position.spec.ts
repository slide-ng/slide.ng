import { describe, expect, it } from 'vitest';
import { readNavPosition } from './nav-position';

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
