import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withSlideSources } from './runtime.mjs';

describe('withSlideSources', () => {
  it("adds the markdown file and line to Angular's errors about a generated slide", () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated'), { recursive: true });
    writeFileSync(
      join(app, 'src/slides/generated/slide-003.ts'),
      '// GENERATED from slides.md:41 (slide 3) - do not edit\n',
    );
    expect(withSlideSources('ERROR src/slides/generated/slide-003.ts:11:110 - NG5002', app)).toBe(
      'ERROR src/slides/generated/slide-003.ts:11:110 (slide 3, slides.md:41) - NG5002',
    );
    expect(withSlideSources('src/slides/generated/slide-009.ts:1:1', app)).toBe(
      'src/slides/generated/slide-009.ts:1:1',
    );
  });
  it("names the author's own file for an error in a copied theme or deck file", () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated'), { recursive: true });
    writeFileSync(
      join(app, 'src/slides/generated/roots.json'),
      JSON.stringify({ deck: '/talk', 'theme-t': '/themes/t' }),
    );
    expect(
      withSlideSources(
        `ERROR ${app}/src/slides/generated/roots/deck/components/signup.ts:73:2 - TS2339`,
        app,
      ),
    ).toBe('ERROR /talk/components/signup.ts:73:2 - TS2339');
    expect(withSlideSources('src/slides/generated/roots/theme-t/layouts/split.ts:5:37', app)).toBe(
      '/themes/t/layouts/split.ts:5:37',
    );
  });
});
