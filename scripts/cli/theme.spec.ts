import { describe, expect, it } from 'vitest';
import { rewriteImports } from './theme.mjs';

describe('rewriteImports', () => {
  it('points built-in relative imports, helpers included, at slide-ng/', () => {
    expect(
      rewriteImports(
        "import { ClicksContext } from '../lib/clicks';\nimport { x } from './background';",
      ),
    ).toBe(
      "import { ClicksContext } from 'slide-ng/lib/clicks';\nimport { x } from 'slide-ng/layouts/background';",
    );
    expect(rewriteImports("import { a } from '@angular/core';")).toBe(
      "import { a } from '@angular/core';",
    );
  });
});
