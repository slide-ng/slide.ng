import { describe, expect, it } from 'vitest';
import { checkRouteAlias, checkUniqueAliases } from './route-alias.mjs';

describe('checkRouteAlias', () => {
  it('passes a normal alias and a missing one', () => {
    expect(checkRouteAlias('intro', 2)).toBe('intro');
    expect(checkRouteAlias(undefined, 2)).toBeNull();
  });
  it.each(['print', 'notes', 'presenter'])('rejects %s with the slide number', (name) => {
    expect(() => checkRouteAlias(name, 4)).toThrow(/slide 4: routeAlias "/);
  });
  it('rejects a number, which an address reads as a slide number', () => {
    expect(() => checkRouteAlias(2, 5)).toThrow('slide 5: routeAlias "2" is a number');
    expect(() => checkRouteAlias('07', 5)).toThrow('is a number');
    expect(checkRouteAlias('part-2', 5)).toBe('part-2');
  });
  it('rejects an empty alias and one an address cannot hold as one name', () => {
    expect(() => checkRouteAlias('', 3)).toThrow('slide 3: routeAlias is empty');
    expect(() => checkRouteAlias('  ', 3)).toThrow('is empty');
    expect(() => checkRouteAlias('a/b', 3)).toThrow('slide 3: routeAlias "a/b" has "/"');
    expect(() => checkRouteAlias(1.5, 3)).toThrow('routeAlias "1.5" has "."');
    expect(() => checkRouteAlias('what?x=1', 3)).toThrow('has "?"');
    expect(checkRouteAlias('café', 3)).toBe('café');
  });
});

describe('checkUniqueAliases', () => {
  it('names every slide that has the same alias', () => {
    expect(() => checkUniqueAliases(['a', null, 'dup', 'dup', 'dup'])).toThrow(
      'slides 3, 4, 5: routeAlias "dup" is on more than one slide',
    );
    expect(() => checkUniqueAliases(['a', null, 'b', null])).not.toThrow();
  });
});
