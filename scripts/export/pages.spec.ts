import { pagesToExport } from './index.mjs';

describe('pagesToExport', () => {
  const deck = { slides: Array.from({ length: 6 }, () => ({})) };
  it('reads slide numbers and ranges', () => {
    expect(pagesToExport(deck, '1,3-4')).toEqual([1, 3, 4]);
    expect(pagesToExport(deck, '5-')).toEqual([5, 6]);
    expect(pagesToExport(deck, undefined)).toHaveLength(6);
  });
  it('says that text which is not a range is not one, instead of "matches no slide"', () => {
    expect(() => pagesToExport(deck, '2-x')).toThrow(
      'export: the range "2-x" is not a range ("2-x"): write slide numbers and ranges, such as 1,3-5 or 4-',
    );
    expect(() => pagesToExport(deck, '1,two')).toThrow('is not a range ("two")');
    expect(() => pagesToExport(deck, '9')).toThrow('matches no slide (the deck has 6)');
  });
});
