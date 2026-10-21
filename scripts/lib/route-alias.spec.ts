import { describe, expect, it } from 'vitest';
import { checkRouteAlias } from './route-alias.mjs';

describe('checkRouteAlias', () => {
  it('passes a normal alias and a missing one', () => {
    expect(checkRouteAlias('intro', 2)).toBe('intro');
    expect(checkRouteAlias(undefined, 2)).toBeNull();
  });
  it.each(['print', 'notes', 'presenter', 'overview', 'entry', 'notes-edit'])(
    'rejects %s with the slide number',
    (name) => {
      expect(() => checkRouteAlias(name, 4)).toThrow(/slide 4: routeAlias "/);
    },
  );
});
