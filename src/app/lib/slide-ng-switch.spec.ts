import { parseSlots, switchTransition } from './slide-ng-switch';

const items = (...ats: string[]) => ats.map((at) => ({ el: document.createElement('div'), at }));
const range = (s: { start: number; end: number }) => [s.start, s.end];

describe('parseSlots', () => {
  it('a single number lasts until the next one starts', () => {
    const slots = parseSlots(items('1', '2', '5'));
    // sorted from the biggest start, as in Slidev
    expect(slots.map(range)).toEqual([
      [5, 6],
      [2, 5],
      [1, 2],
    ]);
  });
  it('a range is explicit', () => {
    expect(parseSlots(items('1', '2-4')).map(range)).toEqual([
      [2, 4],
      [1, 2],
    ]);
  });
  it('rejects a broken range', () => {
    expect(() => parseSlots(items('2-x'))).toThrow('Invalid range');
  });
});

describe('switchTransition', () => {
  it('a bare transition or true is a fade', () => {
    expect(switchTransition('')).toBe('fade');
    expect(switchTransition('true')).toBe('fade');
    expect(switchTransition(true)).toBe('fade');
  });
  it('a name is kept, false or nothing is none', () => {
    expect(switchTransition('slide-left')).toBe('slide-left');
    expect(switchTransition('false')).toBe(false);
    expect(switchTransition(undefined)).toBe(false);
  });
});
