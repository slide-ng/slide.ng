import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RootNotFoundError,
  candidateNames,
  findRootDir,
  mergeHeadmatter,
  packageToInstall,
  readManifest,
  resolveRoots,
} from './roots.mjs';

const folder = () => mkdtempSync(join(tmpdir(), 'slide-ng-roots-'));
const dirIn = (base: string, ...parts: string[]) => {
  const d = join(base, ...parts);
  mkdirSync(d, { recursive: true });
  return d;
};

describe('findRootDir', () => {
  it('finds a folder by relative path', () => {
    const deck = folder();
    const theme = dirIn(deck, 'my-theme');
    expect(findRootDir('./my-theme', 'theme', deck)).toContain('my-theme');
    expect(theme).toBeTruthy();
  });
  it('finds packages named slide-ng-theme-<name> or <name>, also in a parent folder', () => {
    const base = folder();
    dirIn(base, 'node_modules', 'slide-ng-theme-ocean');
    dirIn(base, 'node_modules', 'plain-name');
    const deck = dirIn(base, 'talks', 'one');
    expect(findRootDir('ocean', 'theme', deck)).toContain('slide-ng-theme-ocean');
    expect(findRootDir('plain-name', 'addon', deck)).toContain('plain-name');
  });
  it('says what to do when nothing is found', () => {
    expect(() => findRootDir('nope', 'theme', folder())).toThrow(
      'Install it with: npm install -D slide-ng-theme-nope',
    );
    expect(() => findRootDir('nope', 'addon', folder())).toThrow(RootNotFoundError);
    expect(() => findRootDir('./nope', 'theme', folder())).toThrow('is not a folder');
    expect(() => findRootDir('', 'theme', folder())).toThrow('expected a name');
  });
});

describe('theme and addon names in node_modules (the rule of Slidev)', () => {
  it('tries @slide-ng/theme-<name>, then slide-ng-theme-<name>, then <name>', () => {
    expect(candidateNames('seriph', 'theme')).toEqual([
      '@slide-ng/theme-seriph',
      'slide-ng-theme-seriph',
      'seriph',
    ]);
    expect(candidateNames('charts', 'addon')).toEqual([
      '@slide-ng/addon-charts',
      'slide-ng-addon-charts',
      'charts',
    ]);
    expect(candidateNames('@me/theme-x', 'theme')).toEqual(['@me/theme-x']);
  });
  it("reads the deck's own theme.json, so its layouts can declare inputs and slots", () => {
    const deck = folder();
    writeFileSync(
      join(deck, 'theme.json'),
      JSON.stringify({ layouts: { recipe: { props: ['serves'], slots: ['ingredients'] } } }),
    );
    const roots = resolveRoots({ deckRoot: deck, headmatter: {} });
    expect(roots.at(-1)?.manifest.layouts['recipe']).toEqual({
      props: ['serves'],
      slots: ['ingredients'],
      classProp: undefined,
    });
  });
  it('finds the official scoped package, in a parent folder too', () => {
    const base = folder();
    dirIn(base, 'node_modules', '@slide-ng', 'theme-seriph');
    const deck = dirIn(base, 'talks', 'one');
    expect(
      resolveRoots({ deckRoot: deck, headmatter: { theme: 'seriph' } }).map((r) => r.id),
    ).toEqual(['theme-seriph', 'deck']);
  });
  it('prefers the scoped package over the prefixed one, and the prefixed one over the bare name', () => {
    const base = folder();
    ['slide-ng-theme-x', 'x'].forEach((n) => dirIn(base, 'node_modules', n));
    expect(findRootDir('x', 'theme', base)).toContain('slide-ng-theme-x');
    dirIn(base, 'node_modules', '@slide-ng', 'theme-x');
    expect(findRootDir('x', 'theme', base)).toContain(join('@slide-ng', 'theme-x'));
  });
  it('uses a scoped name as it is and a full package name only as written', () => {
    const base = folder();
    dirIn(base, 'node_modules', '@me', 'theme-x');
    expect(findRootDir('@me/theme-x', 'theme', base)).toContain(join('@me', 'theme-x'));
    expect(() => findRootDir('@me/theme-y', 'theme', base)).toThrow('npm install -D @me/theme-y');
  });
  it('has no built-in folder: an official name that is not installed fails with its scoped package to install', () => {
    for (const name of ['seriph', 'shibainu', 'bricks', 'apple-basic', 'adev']) {
      expect(() => resolveRoots({ deckRoot: folder(), headmatter: { theme: name } })).toThrow(
        `The theme "${name}" was not found. Install it with: npm install -D @slide-ng/theme-${name}`,
      );
    }
  });
  it('keeps default and none as the built-in look, with no root', () => {
    expect(
      resolveRoots({ deckRoot: folder(), headmatter: { theme: 'default' } }).map((r) => r.id),
    ).toEqual(['deck']);
  });
  it('names the install package: official themes are scoped, others and addons are slide-ng-<kind>-<name>', () => {
    expect(packageToInstall('seriph', 'theme')).toBe('@slide-ng/theme-seriph');
    expect(packageToInstall('ocean', 'theme')).toBe('slide-ng-theme-ocean');
    expect(packageToInstall('seriph', 'addon')).toBe('slide-ng-addon-seriph');
  });
  it('does not take an official name as an addon, or as a path', () => {
    expect(() => findRootDir('seriph', 'addon', folder())).toThrow(RootNotFoundError);
    expect(() => findRootDir('./seriph', 'theme', folder())).toThrow('is not a folder');
  });
});

describe('readManifest', () => {
  it('is empty without a theme.json', () =>
    expect(readManifest(folder())).toEqual({ headmatter: {}, layouts: {} }));
  it('reads name, headmatter and layouts and drops bad entries', () => {
    const dir = folder();
    writeFileSync(
      join(dir, 'theme.json'),
      JSON.stringify({
        name: 'x',
        headmatter: { colorSchema: 'dark' },
        layouts: {
          hero: { props: ['image', 'bad name'], slots: ['right'], classProp: true },
          odd: 5,
        },
      }),
    );
    const m = readManifest(dir);
    expect(m.name).toBe('x');
    expect(m.headmatter).toEqual({ colorSchema: 'dark' });
    expect(m.layouts['hero']).toEqual({ props: ['image'], slots: ['right'], classProp: true });
    // keys that are not set stay unset, so a replaced built-in layout keeps its own
    expect(m.layouts['odd']).toEqual({ props: undefined, slots: undefined, classProp: undefined });
  });
  it('warns about keys it does not read', () => {
    const dir = folder();
    writeFileSync(join(dir, 'theme.json'), JSON.stringify({ colorSchema: 'dark' }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    readManifest(dir);
    expect(warn.mock.calls[0][0]).toContain('"colorSchema" is not read');
    warn.mockRestore();
  });
  it('refuses broken JSON with the file name', () => {
    const dir = folder();
    writeFileSync(join(dir, 'theme.json'), '{ nope');
    expect(() => readManifest(dir)).toThrow('theme.json is not valid JSON');
  });
});

describe('resolveRoots', () => {
  it('has only the deck without theme or addons, and treats default and none as no theme', () => {
    const deck = folder();
    expect(resolveRoots({ deckRoot: deck, headmatter: {} }).map((r) => r.id)).toEqual(['deck']);
    expect(
      resolveRoots({ deckRoot: deck, headmatter: { theme: 'default' } }).map((r) => r.id),
    ).toEqual(['deck']);
    expect(
      resolveRoots({ deckRoot: deck, headmatter: { theme: 'none' } }).map((r) => r.id),
    ).toEqual(['deck']);
  });
  it('orders theme, addons, deck', () => {
    const deck = folder();
    dirIn(deck, 't');
    dirIn(deck, 'a1');
    dirIn(deck, 'a2');
    const ids = resolveRoots({
      deckRoot: deck,
      headmatter: { theme: './t', addons: ['./a1', './a2'] },
    }).map((r) => r.id);
    expect(ids).toEqual(['theme-t', 'addon-1-a1', 'addon-2-a2', 'deck']);
  });
  it('fails for a theme package that is not installed, naming the install command (like Slidev), and for a missing path', () => {
    const deck = folder();
    expect(() => resolveRoots({ deckRoot: deck, headmatter: { theme: 'ocean' } })).toThrow(
      'The theme "ocean" was not found. Install it with: npm install -D slide-ng-theme-ocean',
    );
    expect(() => resolveRoots({ deckRoot: deck, headmatter: { theme: './nope' } })).toThrow(
      'is not a folder',
    );
  });
  it('uses the package manager of the lock file in the install command', () => {
    const deck = folder();
    writeFileSync(join(deck, 'pnpm-lock.yaml'), '');
    expect(() => resolveRoots({ deckRoot: deck, headmatter: { theme: 'ocean' } })).toThrow(
      'pnpm add -D slide-ng-theme-ocean',
    );
  });
  it('reads a name with a slash as a path and @/ as relative to the deck, like Slidev', () => {
    const deck = folder();
    dirIn(deck, 'themes', 'mine');
    expect(findRootDir('themes/mine', 'theme', deck)).toContain('mine');
    expect(findRootDir('@/themes/mine', 'theme', deck)).toContain('mine');
  });
  it('refuses names that are not npm package names', () => {
    expect(() => findRootDir('@x', 'theme', folder())).toThrow('Invalid theme name');
    expect(() => findRootDir('UPPER', 'theme', folder())).toThrow('Invalid theme name');
  });
  it('lets --theme win over the headmatter', () => {
    const deck = folder();
    dirIn(deck, 'a');
    dirIn(deck, 'b');
    expect(
      resolveRoots({ deckRoot: deck, headmatter: { theme: './a' }, themeOverride: './b' })[0].id,
    ).toBe('theme-b');
  });
});

describe('mergeHeadmatter', () => {
  const root = (headmatter: object) => ({ manifest: { headmatter } });
  it('puts the deck over addons over the theme', () => {
    const merged = mergeHeadmatter(
      [root({ colorSchema: 'dark', transition: 'fade' }), root({ transition: 'slide-left' })],
      { transition: 'none', title: 'T' },
    );
    expect(merged).toEqual({ colorSchema: 'dark', transition: 'none', title: 'T' });
  });
  it('merges the fonts of a theme with the deck key by key', () => {
    const merged = mergeHeadmatter([root({ fonts: { sans: 'PT Serif', mono: 'PT Mono' } })], {
      fonts: { mono: 'Fira Code' },
    });
    expect(merged).toMatchObject({ fonts: { sans: 'PT Serif', mono: 'Fira Code' } });
  });
  it('merges themeConfig of the theme, the addons and the deck key by key', () => {
    const merged = mergeHeadmatter(
      [root({ themeConfig: { primary: '#111', accent: '#222' } }), root({ themeConfig: { x: 1 } })],
      { themeConfig: { primary: '#333' } },
    );
    expect(merged).toMatchObject({ themeConfig: { primary: '#333', accent: '#222', x: 1 } });
  });
  it('keeps the mode of a theme made for one mode', () => {
    expect(
      mergeHeadmatter([root({ colorSchema: 'light' })], { colorSchema: 'auto' }),
    ).toMatchObject({
      colorSchema: 'light',
    });
    expect(mergeHeadmatter([root({})], { colorSchema: 'dark' })).toMatchObject({
      colorSchema: 'dark',
    });
  });
  it('merges defaults key by key', () => {
    const merged = mergeHeadmatter([root({ defaults: { layout: 'center', class: 'a' } })], {
      defaults: { class: 'b' },
    });
    expect(merged.defaults).toEqual({ layout: 'center', class: 'b' });
  });
});
