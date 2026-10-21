import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { syncRoots, syncTree } from './sync-roots.mjs';

const folder = () => mkdtempSync(join(tmpdir(), 'slide-ng-sync-'));
function put(base: string, files: Record<string, string>) {
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(base, path, '..'), { recursive: true });
    writeFileSync(join(base, path), text);
  }
}

describe('syncTree', () => {
  it('copies new files, updates changed ones and removes the ones that are gone', () => {
    const from = folder(),
      to = folder();
    put(from, { 'a.ts': 'A', 'sub/b.ts': 'B' });
    put(to, { 'old.ts': 'old', 'a.ts': 'stale' });
    syncTree(from, to);
    expect(readFileSync(join(to, 'a.ts'), 'utf8')).toBe('A');
    expect(readFileSync(join(to, 'sub/b.ts'), 'utf8')).toBe('B');
    expect(existsSync(join(to, 'old.ts'))).toBe(false);
  });
  it('does not touch a file that has not changed', () => {
    const from = folder(),
      to = folder();
    put(from, { 'a.ts': 'A' });
    syncTree(from, to);
    const before = statSync(join(to, 'a.ts')).mtimeMs;
    syncTree(from, to);
    expect(statSync(join(to, 'a.ts')).mtimeMs).toBe(before);
  });
  it('leaves out node_modules and symbolic links', () => {
    const from = folder(),
      to = folder(),
      outside = folder();
    put(from, { 'a.ts': 'A', 'node_modules/x/index.js': 'x' });
    put(outside, { 'secret.txt': 'secret' });
    symlinkSync(join(outside, 'secret.txt'), join(from, 'link.txt'));
    syncTree(from, to);
    expect(existsSync(join(to, 'node_modules'))).toBe(false);
    expect(existsSync(join(to, 'link.txt'))).toBe(false);
  });
});

describe('syncRoots', () => {
  it('copies folders under the root id and merges public, later roots winning', () => {
    const generated = folder();
    const theme = folder(),
      deck = folder();
    put(theme, {
      'layouts/a.ts': 'theme layout',
      'public/logo.png': 'theme logo',
      'public/only-theme.txt': 't',
      'ignored/x.txt': 'x',
    });
    put(deck, { 'components/b.ts': 'deck component', 'public/logo.png': 'deck logo' });
    const result = syncRoots(
      [
        { id: 'theme-t', dir: theme },
        { id: 'deck', dir: deck },
      ],
      generated,
    );
    expect(result).toEqual([
      { id: 'theme-t', folders: ['layouts', 'public'] },
      { id: 'deck', folders: ['components', 'public'] },
    ]);
    expect(readFileSync(join(generated, 'roots/theme-t/layouts/a.ts'), 'utf8')).toBe(
      'theme layout',
    );
    expect(readFileSync(join(generated, 'roots/deck/components/b.ts'), 'utf8')).toBe(
      'deck component',
    );
    expect(readFileSync(join(generated, 'public/logo.png'), 'utf8')).toBe('deck logo');
    expect(readFileSync(join(generated, 'public/only-theme.txt'), 'utf8')).toBe('t');
    expect(existsSync(join(generated, 'roots/theme-t/ignored'))).toBe(false);
  });
  it('removes what a root no longer has', () => {
    const generated = folder(),
      theme = folder();
    put(theme, { 'layouts/a.ts': 'A', 'public/x.txt': 'x' });
    syncRoots([{ id: 't', dir: theme }], generated);
    put(theme, {});
    writeFileSync(join(theme, 'layouts/a.ts'), 'A2');
    mkdirSync(join(theme, 'layouts'), { recursive: true });
    syncRoots([{ id: 'other', dir: folder() }], generated);
    expect(existsSync(join(generated, 'roots/t'))).toBe(false);
    expect(existsSync(join(generated, 'public/x.txt'))).toBe(false);
  });
  it('warns about a root folder that is a symbolic link, and does not follow it', () => {
    const generated = folder(),
      deck = folder(),
      pictures = folder();
    put(pictures, { 'a.png': 'A' });
    symlinkSync(pictures, join(deck, 'public'), 'dir');
    const warnings: string[] = [];
    const result = syncRoots([{ id: 'deck', dir: deck }], generated, (m) => warnings.push(m));
    expect(result).toEqual([{ id: 'deck', folders: [] }]);
    expect(existsSync(join(generated, 'public/a.png'))).toBe(false);
    expect(warnings).toEqual([
      expect.stringMatching(/public\/ is a symbolic link.*not copied.*real folder/),
    ]);
  });
});
