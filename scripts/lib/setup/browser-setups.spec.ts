import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { setupSource } from '../theme-files.mjs';

function root(id: string, names: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'slide-ng-browser-setup-'));
  mkdirSync(join(dir, 'setup'));
  for (const n of names) writeFileSync(join(dir, 'setup', `${n}.ts`), 'export default () => []');
  return { id, dir };
}

describe('setupSource', () => {
  it('is an empty list when no root has a setup file', () => {
    const text = setupSource([root('deck', [])]);
    expect(text).toContain('SETUP_PROVIDERS: (Provider | EnvironmentProviders)[] = []');
    expect(text).not.toContain("from '../../app/setup'");
  });

  it('imports each setup file and hands the files, weakest root first, to the helper', () => {
    const text = setupSource([
      root('theme-a', ['shortcuts', 'mermaid']),
      root('deck', ['shortcuts', 'main', 'code-runners']),
    ]);
    expect(text).toMatch(/import shortcuts\d from '\.\/roots\/theme-a\/setup\/shortcuts'/);
    expect(text).toMatch(/\.\.\.shortcutsProviders\(\[shortcuts\d, shortcuts\d\]\)/);
    expect(text).toMatch(/\.\.\.mainProviders\(\[main\d\]\)/);
    expect(text).toMatch(/\.\.\.mermaidProviders\(\[mermaid\d\]\)/);
    expect(text).toMatch(/\.\.\.codeRunnerProviders\(\[codeRunners\d\]\)/);
    expect(text).toContain("from '../../app/setup'");
    expect(text.indexOf('theme-a/setup/shortcuts')).toBeLessThan(
      text.indexOf('deck/setup/shortcuts'),
    );
  });

  it('hands setup/routes.ts and setup/mermaid-renderer.ts to their helpers', () => {
    const text = setupSource([root('theme-a', ['mermaid-renderer']), root('deck', ['routes'])]);
    expect(text).toMatch(
      /import mermaidRenderer\d from '\.\/roots\/theme-a\/setup\/mermaid-renderer'/,
    );
    expect(text).toMatch(/\.\.\.mermaidRendererProviders\(\[mermaidRenderer\d\]\)/);
    expect(text).toMatch(/\.\.\.routesProviders\(\[routes\d\]\)/);
    expect(text).toContain('import { mermaidRendererProviders, routesProviders }');
  });

  it('keeps code runners from providers.ts and code-runners.ts in root order, so the deck wins', () => {
    const text = setupSource([root('addon-a', ['code-runners']), root('deck', ['providers'])]);
    expect(text.indexOf('...codeRunnerProviders(')).toBeLessThan(text.indexOf('...providers1'));
  });

  it('still reads the older setup/providers.ts', () => {
    expect(setupSource([root('deck', ['providers'])])).toMatch(/\.\.\.providers0\]/);
  });
});
