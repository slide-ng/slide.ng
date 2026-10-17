// Where the Angular app and the generator live, and how to run them for one deck.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ngBinary, prepareApp } from './app-root.mjs';
import { packageRoot } from './package-root.mjs';
import { claimDirectory, markDirectory } from './safe-dir.mjs';

export { packageRoot };

// Angular's errors name the generated file (src/slides/generated/slide-003.ts); add the markdown file and line it came from,
// which the generator wrote into the file's first line.
export function withSlideSources(text, appRoot) {
  return text.replace(
    /src\/slides\/generated\/(slide-(\d+))\.ts(:\d+:\d+)?/g,
    (match, name, no) => {
      try {
        const first = readFileSync(
          join(appRoot, 'src/slides/generated', `${name}.ts`),
          'utf8',
        ).split('\n')[0];
        const from = /GENERATED from (\S+)/.exec(first)?.[1];
        return from ? `${match} (slide ${+no}, ${from})` : match;
      } catch {
        return match;
      }
    },
  );
}

function run(args, { cwd, env, quiet }) {
  // Errors are kept (stderr is piped) so they can name the markdown line; progress still shows when not quiet.
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: quiet ? 'pipe' : ['inherit', 'inherit', 'pipe'],
    encoding: 'utf8',
  });
  if (!quiet && result.stderr) process.stderr.write(withSlideSources(result.stderr, cwd));
  if (result.status !== 0) {
    if (quiet)
      process.stderr.write(withSlideSources(`${result.stdout ?? ''}${result.stderr ?? ''}`, cwd));
    const what = args[0].includes('generate') ? 'generating the slides' : 'the Angular build';
    // Killed (by the system, for example out of memory) leaves no output of its own: say that instead of "exit code null".
    throw new Error(
      result.signal
        ? `${what} was stopped by ${result.signal} (often a lack of memory, for example with several builds at once); run it again`
        : `${what} failed (exit code ${result.status})`,
    );
  }
}

/** Writes the generated slides for `entry` (an absolute path to the deck's markdown file). */
export function generateSlides(
  entry,
  { quiet = false, env = {}, appRoot = prepareApp(entry) } = {},
) {
  run([join(packageRoot, 'scripts/generate.mjs')], {
    cwd: appRoot,
    env: { SLIDES_FILE: entry, ...env },
    quiet,
  });
}

/**
 * Generates and builds the deck into `workDir` (a folder this tool owns and empties, see safe-dir.mjs).
 * Resolves to the folder with `index.html` inside it. `base` is the address the deck will be served under.
 * `env` reaches the generator and the build (SLIDE_NG_BUILD and friends, see scripts/lib/build-options.mjs).
 */
export function buildDeck({
  entry,
  workDir,
  base = '/',
  quiet = false,
  cwd = process.cwd(),
  env = {},
}) {
  claimDirectory(workDir, cwd);
  const appRoot = prepareApp(entry); // this package itself for decks inside it, a working copy for any other deck
  generateSlides(entry, { quiet, appRoot, env: { SLIDE_NG_BASE: base, ...env } });
  run([ngBinary(), 'build', '--output-path', workDir, '--base-href', base], {
    cwd: appRoot,
    env: { SLIDES_FILE: entry, ...env },
    quiet,
  });
  markDirectory(workDir);
  return join(workDir, 'browser');
}
