// Where the Angular app and the generator live, and how to run them for one deck.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ngBinary, prepareApp } from './app-root.mjs';
import { packageRoot } from './package-root.mjs';
import { nearest } from '../lib/did-you-mean.mjs';
import { BUILTIN_ELEMENTS } from '../lib/registry.mjs';
import { ROOT_FOLDERS } from '../lib/roots.mjs';
import { declarations } from '../lib/scan-roots.mjs';
import { claimDirectory, markDirectory } from './safe-dir.mjs';

export { packageRoot };

// The element names a slide can use: the built-in ones and the tags of the components and layouts the deck and its themes
// bring (their copies under generated/roots/<id>/).
function knownTags(generated) {
  const tags = [...BUILTIN_ELEMENTS];
  const roots = join(generated, 'roots');
  for (const id of existsSync(roots) ? readdirSync(roots) : [])
    for (const folder of ['components', 'layouts', 'layers']) {
      const dir = join(roots, id, folder);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts')))
        for (const { selector } of declarations(readFileSync(join(dir, file), 'utf8')))
          tags.push(
            ...selector
              .split(',')
              .map((s) => s.trim())
              .filter((s) => /^[a-z]/.test(s)),
          );
    }
  return tags;
}

// Angular's errors name the generated file (src/slides/generated/slide-003.ts); add the markdown file and line it came from,
// which the generator wrote into the file's first line.
export function withSlideSources(text, appRoot) {
  const generated = join(appRoot, 'src/slides/generated');
  let roots = null; // read once, when an error names a copied theme or deck file
  let tags = null; // read once, when an element is not known
  return text
    .replace(/src\/slides\/generated\/(slide-(\d+))\.ts(:\d+:\d+)?/g, (match, name, no) => {
      try {
        const first = readFileSync(join(generated, `${name}.ts`), 'utf8').split('\n')[0];
        const from = /GENERATED from (\S+)/.exec(first)?.[1];
        return from ? `${match} (slide ${+no}, ${from})` : match;
      } catch {
        return match;
      }
    })
    .replace(/\S*src\/slides\/generated\/roots\/([\w.-]+)\/([^\s:]+)/g, (match, id, rest) => {
      try {
        roots ??= JSON.parse(readFileSync(join(generated, 'roots.json'), 'utf8'));
        return roots[id] ? join(roots[id], rest) : match;
      } catch {
        return match;
      }
    })
    .replace(/'([a-z][\w.]*-[\w.-]*)' is not a known element:/g, (match, tag) => {
      // A near miss of a known name is a typo, not a web component.
      const near = nearest(tag, (tags ??= knownTags(generated)));
      return near
        ? `${match} (did you mean <${near}>?)`
        : `${match} (a component of the deck: is its file in components/, with selector '${tag}'? In a layout, layer or component file, also add it to that file's imports: [...]. An icon: <span class="i-set:name"></span>. A web component: list it in the deck's headmatter, customElements: [${tag}])`;
    })
    .replace(
      /Could not resolve "(\.\.\/[^"]*)"/g,
      (match) =>
        `${match} (only the folders ${ROOT_FOLDERS.join(', ')} of a deck or theme are copied into the app: keep shared code inside one of them)`,
    );
}

// eslint-disable-next-line no-control-regex -- the colour codes Angular writes on a terminal
const ANSI = /\x1b\[[0-9;]*m/g;
const BLOCK_START = /^\s*[✘▲] \[(ERROR|WARNING)\]/;
// A line of an error block: empty, indented, or one of Angular's numbered hints.
const IN_BLOCK = /^(\s|$|\d+\. )/;
const UNKNOWN = /NG8001: '([^']+)' is not a known element/;
const FOLLOW_ON = /NG8002: Can't bind to '[^']+' since it isn't a known property of '([^']+)'/;
// A failed rebuild that repeats the errors of the one just before within this time is the same change seen twice (deleting
// components/ rebuilds once for the folder and once for the slides the generator writes again).
const SAME_WINDOW_MS = 10_000;

/**
 * Tidies the Angular compiler's output line by line, for `build` and the dev server: Angular's "Can't bind to 'x' since it
 * isn't a known property of 'y'" (NG8002) is left out when 'y' is an unknown element already (NG8001 says what is wrong),
 * and a rebuild that fails with the same errors as the one just before says so in one line instead of printing them again.
 * `write(line, to)` gets the lines to print; `to` is the stream the line came from. Call `flush()` at the end.
 */
export function angularOutput(write, { now = Date.now, idleMs = 300 } = {}) {
  let block = null; // the lines of the error or warning being read: [{ line, to }]
  let unknown = new Set();
  let cycle = []; // the error texts of this rebuild
  let last = null; // those of the rebuild before: { texts, at }
  let cycleAt = 0; // when the last of them was printed
  let noted = false;
  let timer;
  const endBlock = () => {
    clearTimeout(timer);
    if (!block) return;
    const lines = block;
    block = null;
    const text = lines
      .map((l) => l.line.replace(ANSI, ''))
      .join('\n')
      .trimEnd();
    const name = UNKNOWN.exec(text)?.[1];
    if (name) unknown.add(name);
    const follow = FOLLOW_ON.exec(text)?.[1];
    if (follow && unknown.has(follow)) return;
    const isError = /^\s*✘/.test(text);
    if (isError) (cycle.push(text), (cycleAt = now()));
    if (isError && last && now() - last.at < SAME_WINDOW_MS && last.texts.has(text)) {
      if (!noted)
        write(
          '[slide.ng] the same error as in the rebuild just before (not printed again)',
          lines[0].to,
        );
      noted = true;
      return;
    }
    for (const l of lines) write(l.line, l.to);
  };
  const endCycle = () => {
    if (cycle.length) last = { texts: new Set(cycle), at: cycleAt };
    cycle = [];
    unknown = new Set();
    noted = false;
  };
  return {
    line(line, to) {
      const plain = line.replace(ANSI, '');
      if (BLOCK_START.test(plain)) {
        endBlock();
        block = [{ line, to }];
      } else if (block && IN_BLOCK.test(plain)) {
        block.push({ line, to });
      } else {
        endBlock();
        if (/Changes detected\. Rebuilding|^\s*❯ Building/.test(plain)) endCycle();
        if (/Application bundle generation complete/.test(plain)) [last, cycle] = [null, []];
        write(line, to);
      }
      // A block that is the last output (nothing follows it yet) is printed after a moment.
      if (block && idleMs >= 0) {
        clearTimeout(timer);
        timer = setTimeout(endBlock, idleMs);
        timer.unref?.();
      }
    },
    flush: endBlock,
  };
}

function run(args, { cwd, env, quiet }) {
  // Errors are kept (stderr is piped) so they can name the markdown line; progress still shows when not quiet.
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: quiet ? 'pipe' : ['inherit', 'inherit', 'pipe'],
    encoding: 'utf8',
  });
  const print = (text) => {
    const out = [];
    const tidy = angularOutput((line) => out.push(line), { idleMs: -1 });
    for (const line of withSlideSources(text, cwd).replace(/\n$/, '').split('\n')) tidy.line(line);
    tidy.flush();
    if (out.length) process.stderr.write(`${out.join('\n')}\n`);
  };
  if (!quiet && result.stderr) print(result.stderr);
  if (result.status !== 0) {
    if (quiet) print(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    const what = args[0].includes('generate') ? 'generating the slides' : 'the Angular build';
    // Killed (by the system, for example out of memory) leaves no output of its own: say that instead of "exit code null".
    // The generator prints why it stopped, so its failure needs no second line (`reported`, see bin/slide-ng.mjs).
    throw Object.assign(
      new Error(
        result.signal
          ? `${what} was stopped by ${result.signal} (often a lack of memory, for example with several builds at once); run it again`
          : `${what} failed (exit code ${result.status})`,
      ),
      { reported: !result.signal && what === 'generating the slides' },
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
  folder = 'app-build',
}) {
  claimDirectory(workDir, cwd);
  // this package itself for decks inside it, a working copy for any other deck (its own, so `dev` can keep running)
  const appRoot = prepareApp(entry, folder);
  generateSlides(entry, { quiet, appRoot, env: { SLIDE_NG_BASE: base, ...env } });
  run([ngBinary(), 'build', '--output-path', workDir, '--base-href', base], {
    cwd: appRoot,
    env: { SLIDES_FILE: entry, ...env },
    quiet,
  });
  markDirectory(workDir);
  return join(workDir, 'browser');
}
