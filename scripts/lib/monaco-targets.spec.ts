import { writeTargetProblem } from './monaco-targets.mjs';

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
});
