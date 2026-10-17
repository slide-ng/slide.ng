// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { forgetStaleDeps, prepareApp } from '../cli/app-root.mjs';
import { buildCommand } from '../cli/build.mjs';
import { exportCommand } from '../cli/export.mjs';
import { checkToolDir, removeInside } from './tool-dir.mjs';

// A deck folder whose `.slide-ng` is a link to a folder that holds things that must survive.
function hostileDeck() {
  const victim = mkdtempSync(join(tmpdir(), 'tooldir-victim-'));
  mkdirSync(join(victim, 'app/src'), { recursive: true });
  mkdirSync(join(victim, 'build'), { recursive: true });
  writeFileSync(join(victim, 'app/src/precious.ts'), 'keep');
  writeFileSync(join(victim, 'angular.json'), 'keep');
  writeFileSync(join(victim, 'build/precious'), 'keep');
  const deck = mkdtempSync(join(tmpdir(), 'tooldir-deck-'));
  writeFileSync(join(deck, 'slides.md'), '# Hi\n');
  symlinkSync(victim, join(deck, '.slide-ng'));
  return { victim, deck, entry: join(deck, 'slides.md') };
}
const intact = (victim: string) =>
  existsSync(join(victim, 'app/src/precious.ts')) &&
  existsSync(join(victim, 'angular.json')) &&
  existsSync(join(victim, 'build/precious'));

describe('checkToolDir', () => {
  it('allows a missing folder and a real one', () => {
    const deck = mkdtempSync(join(tmpdir(), 'tooldir-'));
    expect(checkToolDir(deck)).toBe(join(deck, '.slide-ng'));
    mkdirSync(join(deck, '.slide-ng'));
    expect(checkToolDir(deck)).toBe(join(deck, '.slide-ng'));
  });
  it('refuses a symbolic link and a file', () => {
    const { deck } = hostileDeck();
    expect(() => checkToolDir(deck)).toThrow('symbolic link');
    const other = mkdtempSync(join(tmpdir(), 'tooldir-'));
    writeFileSync(join(other, '.slide-ng'), 'x');
    expect(() => checkToolDir(other)).toThrow('not a folder');
  });
});

describe('removeInside', () => {
  it('removes a folder inside the root', () => {
    const root = mkdtempSync(join(tmpdir(), 'tooldir-'));
    mkdirSync(join(root, 'a/b'), { recursive: true });
    removeInside(join(root, 'a'), root);
    expect(existsSync(join(root, 'a'))).toBe(false);
    removeInside(join(root, 'never'), root); // missing is fine
  });
  it('refuses a path whose real place is outside, and only unlinks a link', () => {
    const { victim, deck } = hostileDeck();
    expect(() => removeInside(join(deck, '.slide-ng/app'), deck)).toThrow('not inside');
    expect(intact(victim)).toBe(true);
    const root = mkdtempSync(join(tmpdir(), 'tooldir-'));
    symlinkSync(victim, join(root, 'link'));
    removeInside(join(root, 'link'), root);
    expect(existsSync(join(root, 'link'))).toBe(false);
    expect(intact(victim)).toBe(true);
  });
});

describe('a deck with a symlinked .slide-ng', () => {
  it('prepareApp refuses it and deletes and overwrites nothing', () => {
    const { victim, entry } = hostileDeck();
    expect(() => prepareApp(entry)).toThrow('symbolic link');
    expect(intact(victim)).toBe(true);
  });
  it('build and export refuse it before doing anything', async () => {
    const { victim, deck, entry } = hostileDeck();
    const cwd = process.cwd();
    process.chdir(deck);
    try {
      await expect(buildCommand([entry])).rejects.toThrow('symbolic link');
      await expect(exportCommand([entry])).rejects.toThrow('symbolic link');
    } finally {
      process.chdir(cwd);
    }
    expect(intact(victim)).toBe(true);
  });
});

describe('the app copy of a deck', () => {
  it('drops the dev cache when the deck installs other packages', () => {
    const deck = mkdtempSync(join(tmpdir(), 'appcopy-'));
    const root = join(deck, '.slide-ng/app');
    mkdirSync(join(root, '.angular/cache/vite'), { recursive: true });
    writeFileSync(join(deck, 'package.json'), '{}');
    forgetStaleDeps(root, deck);
    forgetStaleDeps(root, deck);
    expect(existsSync(join(root, '.angular/cache/vite'))).toBe(true);
    writeFileSync(join(deck, 'package.json'), '{ "dependencies": { "chart.js": "5" } }');
    forgetStaleDeps(root, deck);
    expect(existsSync(join(root, '.angular/cache'))).toBe(false);
  });
});
