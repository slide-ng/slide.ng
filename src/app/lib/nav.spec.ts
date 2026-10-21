import { findSlide, slideAddress } from './nav';

describe('findSlide', () => {
  const aliases = [null, 'intro', null];
  it('reads a number and keeps it between the first and the last slide', () => {
    expect(findSlide('2', 3, aliases)).toBe(2);
    expect(findSlide('99', 3, aliases)).toBe(3);
    expect(findSlide('0', 3, aliases)).toBe(1);
  });
  it('finds a slide by its routeAlias', () => {
    expect(findSlide('intro', 3, aliases)).toBe(2);
  });
  it('gives null when nothing matches', () => {
    expect(findSlide('nope', 3, aliases)).toBeNull();
  });
});

describe('slideAddress', () => {
  it('reads the slide part of a markdown link', () => {
    expect(slideAddress('4')).toBe('4');
    expect(slideAddress('/4')).toBe('4');
    expect(slideAddress('./intro')).toBe('intro');
    expect(slideAddress('#/4')).toBe('4');
    expect(slideAddress('/intro#part')).toBe('intro');
    expect(slideAddress('./café')).toBe('café');
    expect(slideAddress('./🚀')).toBe('🚀');
    expect(slideAddress('./My%20Alias')).toBe('My Alias');
  });
  it('gives null for other addresses', () => {
    expect(slideAddress('https://example.org/4')).toBeNull();
    expect(slideAddress('/file.pdf')).toBeNull();
    expect(slideAddress('/a/b')).toBeNull();
    expect(slideAddress('#part')).toBeNull();
  });
});
