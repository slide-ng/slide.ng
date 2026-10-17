import {
  formatArrow,
  formatBox,
  moveArrow,
  moveArrowEnd,
  moveBox,
  nudgeDelta,
  parseArrow,
  parseBox,
  resizeBox,
  rotationTo,
} from './drag-math';

describe('parseBox', () => {
  it('reads both spellings', () => {
    expect(parseBox('[10,20,30,40]')).toEqual({ x: 10, y: 20, w: 30, h: 40, rot: 0 });
    expect(parseBox('10, 20, 30, 40, 15')).toEqual({ x: 10, y: 20, w: 30, h: 40, rot: 15 });
  });
  it('treats _ and NaN as automatic height', () => {
    expect(parseBox('1,2,3,_')?.h).toBeNaN();
    expect(parseBox('[1,2,3,NaN,5]')).toMatchObject({ w: 3, rot: 5 });
    expect(parseBox('1,2,3')?.h).toBeNaN();
  });
  it('refuses anything else', () => {
    for (const t of ['', 'square', '1,2', '1,2,3,4,5,6', 'a,b,c', '_,2,3'])
      expect(parseBox(t)).toBeNull();
  });
});

describe('formatBox', () => {
  it('rounds and writes the array spelling', () => {
    expect(formatBox({ x: 10.4, y: 20.6, w: 30, h: 40, rot: 0 }, 'array')).toBe('[10,21,30,40]');
  });
  it('writes automatic height as NaN in arrays and _ in the plain spelling', () => {
    const b = { x: 1, y: 2, w: 3, h: NaN, rot: 0 };
    expect(formatBox(b, 'array')).toBe('[1,2,3,NaN]');
    expect(formatBox(b, 'plain')).toBe('1,2,3,_');
  });
  it('adds the rotation only when there is one', () => {
    expect(formatBox({ x: 1, y: 2, w: 3, h: 4, rot: 30 }, 'plain')).toBe('1,2,3,4,30');
  });
  it('can be read back', () => {
    const b = { x: 5, y: 6, w: 70, h: NaN, rot: -20 };
    for (const style of ['array', 'plain'] as const)
      expect(parseBox(formatBox(b, style))).toEqual(b);
  });
});

describe('moveBox and nudgeDelta', () => {
  it('moves by the given distance', () => {
    expect(moveBox({ x: 1, y: 2, w: 3, h: 4, rot: 0 }, 10, -5)).toMatchObject({
      x: 11,
      y: -3,
      w: 3,
      h: 4,
    });
  });
  it('nudges 1px with an arrow, 10px with Shift', () => {
    expect(nudgeDelta('ArrowLeft', false)).toEqual({ dx: -1, dy: 0 });
    expect(nudgeDelta('ArrowDown', true)).toEqual({ dx: 0, dy: 10 });
    expect(nudgeDelta('a', false)).toBeNull();
  });
});

describe('resizeBox', () => {
  const b = { x: 100, y: 100, w: 200, h: 100, rot: 0 };
  it('moves the south-east corner and keeps the north-west one', () => {
    expect(resizeBox(b, 'se', 20, 10)).toMatchObject({ x: 100, y: 100, w: 220, h: 110 });
  });
  it('keeps the opposite corner for the north-west handle', () => {
    expect(resizeBox(b, 'nw', 20, 10)).toMatchObject({ x: 120, y: 110, w: 180, h: 90 });
    expect(resizeBox(b, 'ne', 20, -10)).toMatchObject({ x: 100, y: 90, w: 220, h: 110 });
  });
  it('does not get smaller than 10px', () => {
    expect(resizeBox(b, 'se', -500, -500)).toMatchObject({ w: 10, h: 10 });
  });
  it('keeps the proportions with Shift', () => {
    const r = resizeBox(b, 'se', 100, 0, true);
    expect(r.w / r.h).toBeCloseTo(2);
    expect(r.w).toBe(300);
  });
});

describe('rotationTo', () => {
  const c = { x: 0, y: 0 };
  it('is 0 with the pointer straight above and 90 to the right', () => {
    expect(rotationTo(c, { x: 0, y: -50 })).toBe(0);
    expect(rotationTo(c, { x: 50, y: 0 })).toBe(90);
    expect(rotationTo(c, { x: -50, y: 0 })).toBe(-90);
  });
  it('snaps to 15 degrees', () => {
    expect(rotationTo(c, { x: 50, y: -40 }, true) % 15).toBe(0);
  });
});

describe('arrows', () => {
  it('parse and format with four numbers', () => {
    // x, y, width, height as in Slidev: from (10,20) to (40,60); a negative size points back
    expect(parseArrow('10,20,30,40')).toEqual({ x1: 10, y1: 20, x2: 40, y2: 60 });
    expect(parseArrow('400,300,200,-100')).toEqual({ x1: 400, y1: 300, x2: 600, y2: 200 });
    expect(parseArrow('1,2,3')).toBeNull();
    expect(formatArrow({ x1: 1.2, y1: 2, x2: 3, y2: 4.7 })).toBe('1,2,2,3');
  });
  it('moves as a whole or by one end', () => {
    const a = { x1: 0, y1: 0, x2: 10, y2: 10 };
    expect(moveArrow(a, 5, 5)).toEqual({ x1: 5, y1: 5, x2: 15, y2: 15 });
    expect(moveArrowEnd(a, 2, 1, 2)).toEqual({ x1: 0, y1: 0, x2: 11, y2: 12 });
  });
});
