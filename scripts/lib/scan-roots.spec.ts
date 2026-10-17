import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { declarations, scanRoots, selectorTest } from './scan-roots.mjs';

describe('declarations', () => {
  it('finds selector and class of components and directives', () => {
    const source = `
      @Component({ selector: 'my-box', template: '' })
      export class MyBox {}
      @Directive({
        selector: '[my-glow]',
      })
      export class Glow {}`;
    expect(declarations(source)).toEqual([
      { selector: 'my-box', className: 'MyBox' },
      { selector: '[my-glow]', className: 'Glow' },
    ]);
  });
  it('ignores classes that are not exported or not decorated', () => {
    expect(declarations("@Component({ selector: 'a-b' }) class Hidden {}")).toEqual([]);
    expect(declarations('export class Plain {}')).toEqual([]);
  });
});

describe('selectorTest', () => {
  it('matches a tag in a slide', () => {
    expect(selectorTest('my-box').test('<my-box class="x">')).toBe(true);
    expect(selectorTest('my-box').test('<my-boxes>')).toBe(false);
  });
  it('matches an attribute', () => {
    expect(selectorTest('[my-glow]').test('<p my-glow>')).toBe(true);
    expect(selectorTest('[my-glow]').test('<p [my-glow]="x">')).toBe(true);
    expect(selectorTest('[my-glow]').test('<p my-glowing>')).toBe(false);
  });
  it('matches a structural use, a tag with an attribute and a list', () => {
    expect(selectorTest('[repeatTimes]').test('<li *repeatTimes="3; let n">')).toBe(true);
    expect(selectorTest('button[appRipple]').test('<button class="a" appRipple>')).toBe(true);
    expect(selectorTest('button[appRipple]').test('<button appRipple>')).toBe(true);
    expect(selectorTest('ng-template[uiTab]').test('<ng-template uiTab="Install">')).toBe(true);
    expect(selectorTest('button[appRipple]').test('<a appRipple>')).toBe(false);
    expect(selectorTest('[appAutofocus], [focus-me]').test('<input focus-me>')).toBe(true);
    expect(selectorTest('my-card, my-panel').test('<my-panel>')).toBe(true);
    expect(selectorTest('.only-a-class').test('<p class="only-a-class">')).toBe(false);
  });
});

function root(id: string, files: Record<string, string>, layouts = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'slide-ng-scan-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return { id, dir, manifest: { headmatter: {}, layouts } };
}

describe('scanRoots', () => {
  it('adds a new layout with props from theme.json', () => {
    const r = root(
      'theme-x',
      {
        'layouts/hero.ts':
          "@Component({ selector: 'x-hero', template: '' }) export class HeroLayout {}",
      },
      { hero: { props: ['image'], slots: ['right'], classProp: false } },
    );
    const { layouts } = scanRoots([r]);
    expect(layouts['hero']).toMatchObject({
      className: 'HeroLayout',
      tag: 'x-hero',
      importPath: './roots/theme-x/layouts/hero',
      props: ['image'],
      slots: ['right'],
    });
  });
  it('lets a layout replace a built-in one and keep its inputs', () => {
    const r = root('theme-x', {
      'layouts/two-cols.ts':
        "@Component({ selector: 'sn-two-cols', template: '' }) export class MyCols {}",
    });
    const { layouts } = scanRoots([r]);
    expect(layouts['two-cols'].className).toBe('MyCols');
    expect(layouts['two-cols'].slots).toEqual(['left', 'right']);
    expect(layouts['default'].className).toBe('DefaultLayout');
  });
  it('lets a later root win', () => {
    const a = root('theme-a', {
      'layouts/center.ts': "@Component({ selector: 'a-center' }) export class ACenter {}",
    });
    const b = root('deck', {
      'layouts/center.ts': "@Component({ selector: 'b-center' }) export class BCenter {}",
    });
    expect(scanRoots([a, b]).layouts['center'].className).toBe('BCenter');
  });
  it('adds components, tests for their use, and reports unusable files', () => {
    const r = root('deck', {
      'components/box.ts': "@Component({ selector: 'my-box' }) export class MyBox {}",
      'layouts/broken.ts': "@Component({ template: '' }) class NotExported {}",
      'layouts/helper.ts': 'export const nothing = 1;', // a helper (an ejected theme has background.ts)
    });
    const { components, problems } = scanRoots([r]);
    const box = components.find((c: any) => c.className === 'MyBox');
    expect(box.importPath).toBe('./roots/deck/components/box');
    expect(box.test.test('<my-box>')).toBe(true);
    expect(problems[0]).toContain('broken.ts');
    expect(problems.join()).not.toContain('helper.ts');
  });
  it('adds pipes, in use when a slide names them in an expression', () => {
    const r = root('deck', {
      'components/initials.pipe.ts':
        "@Pipe({ name: 'initials' }) export class InitialsPipe { transform(v: string) { return v; } }",
    });
    const pipe = scanRoots([r]).components.find((c: any) => c.className === 'InitialsPipe');
    expect(pipe.importPath).toBe('./roots/deck/components/initials.pipe');
    expect(pipe.test.test("<p>{{ 'Ada Lovelace' | initials }}</p>")).toBe(true);
    expect(pipe.test.test('<td>a | initials</td>')).toBe(false);
  });
});
