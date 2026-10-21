// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { builtBase, exportBase } from './export.mjs';

const build = (head: string | null) => {
  const dist = mkdtempSync(join(tmpdir(), 'slide-ng-export-base-'));
  if (head != null) writeFileSync(join(dist, 'index.html'), `<html><head>${head}</head></html>`);
  return dist;
};

describe('the base of an export from --dist', () => {
  it('reads the base a build was made with', () => {
    expect(builtBase(build('<base href="/decks/a/">'))).toBe('/decks/a/');
    expect(builtBase(build('<base href="./">'))).toBeNull(); // an offline folder works at any path
    expect(builtBase(build(null))).toBeNull();
  });

  it('takes the recorded base without --base, and refuses one that does not match', () => {
    const dist = build('<base href="/decks/a/">');
    expect(exportBase({ dist })).toBe('/decks/a/');
    expect(exportBase({ dist, base: 'decks/a' })).toBe('/decks/a/');
    expect(() => exportBase({ dist, base: '/' })).toThrow(
      'which was made with the base /decks/a/; leave --base out',
    );
    expect(exportBase({ base: '/talk/' })).toBe('/talk/');
    expect(exportBase({})).toBe('/');
  });
});
