import { describe, expect, it } from 'vitest';
import { checkRouteAlias } from './route-alias.mjs';

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
});
