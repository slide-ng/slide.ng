import { mkdirSync, mkdtempSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rootFoldersIn, writeTargetProblem } from './monaco-targets.mjs';

describe('writeTargetProblem', () => {
  it('allows plain snippet files inside the deck', () => {
    for (const p of [
      'demo.ts',
      'snippets/index.html',
      'snippets/a.py',
      'code/x.json',
      'notes.md',
      'a/b/c.css',
    ])
      expect(writeTargetProblem(p)).toBeNull();
  });
  it('denies code the tools load or run', () => {
    for (const p of [
      'setup/shiki.ts',
      'setup/main.ts',
      'layouts/mine.ts',
      'components/c.ts',
      'theme/index.css',
      'index.html',
      'INDEX.HTML',
      'uno.config.ts',
      'vite.config.js',
    ])
      expect(writeTargetProblem(p), p).not.toBeNull();
  });
  it('denies git, package, lock, hidden and generator files', () => {
    for (const p of [
      '.git/hooks/pre-commit',
      '.git/config',
      'node_modules/x/index.js',
      'sub/node_modules/x.ts',
      'package.json',
      'sub/package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      '.slide-ng/monaco-files.json',
      '.env',
      'snippets/.hidden.ts',
      'tsconfig.json',
    ])
      expect(writeTargetProblem(p), p).not.toBeNull();
  });
  it('denies extensions that are not on the list, and paths that leave the deck', () => {
    for (const p of [
      'run.sh',
      'a.exe',
      'noext',
      'a.mjs',
      'a.cjs',
      'a.svg',
      '../x.ts',
      '/etc/x.ts',
      'a/../../x.ts',
      '',
    ])
      expect(writeTargetProblem(p), p).not.toBeNull();
  });
  it('denies the index.html at the top of every theme and addon folder in the deck, not elsewhere', () => {
    const roots = ['my-theme', 'extras/addon-a'];
    for (const p of [
      'my-theme/index.html',
      'My-Theme/INDEX.html',
      './my-theme/index.html',
      'extras/addon-a/index.html',
    ])
      expect(writeTargetProblem(p, roots), p).not.toBeNull();
    for (const p of ['my-theme/demo/index.html', 'extras/index.html', 'snippets/index.html'])
      expect(writeTargetProblem(p, roots), p).toBeNull();
    expect(writeTargetProblem('my-theme/index.html')).toBeNull();
  });
});

describe('writeTargetProblem with a theme under another name', () => {
  it('denies the code folders at the top of every theme and addon folder, not deeper', () => {
    const roots = ['my-theme', 'extras/addon-a'];
    for (const p of [
      'my-theme/setup/main.ts',
      'my-theme/layouts/cover.ts',
      'My-Theme/Components/x.ts',
      'my-theme/styles/index.css',
      'extras/addon-a/setup/shiki.ts',
      'extras/addon-a/public/x.json',
    ])
      expect(writeTargetProblem(p, roots), p).not.toBeNull();
    for (const p of ['my-theme/demo/setup/a.ts', 'extras/setup/a.ts', 'my-theme/snippets/a.ts'])
      expect(writeTargetProblem(p, roots), p).toBeNull();
    expect(writeTargetProblem('my-theme/setup/main.ts')).toBeNull();
  });
});

describe('rootFoldersIn', () => {
  it("gives the roots inside the deck's folder relative to it, and leaves the others out", () => {
    const deck = mkdtempSync(join(tmpdir(), 'slide-ng-targets-'));
    mkdirSync(join(deck, 'my-theme'));
    const real = realpathSync(deck);
    expect(
      rootFoldersIn(deck, [
        join(real, 'my-theme'),
        '/elsewhere/theme',
        join(real, '..'),
        real,
        undefined,
      ]),
    ).toEqual(['my-theme', '']);
  });
});
