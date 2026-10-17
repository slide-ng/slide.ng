// `slide-ng theme eject [--dir theme]`: copies the theme that the deck uses into the deck's folder and points the
// headmatter at the copy (`theme: ./theme`), so it can be edited freely.
//   built-in theme (`default`): the layouts of src/app/layouts (imports rewritten to `slide-ng/...`) and its CSS
//   a theme folder or package:   a copy of its layouts, components, layers, styles, public, setup, theme.json, uno.config.mjs
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { parseFlags } from './flags.mjs';
import { setHeadmatterKey } from '../lib/frontmatter-edit.mjs';
import { findRootDir } from '../lib/roots.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';
import { packageRoot } from './runtime.mjs';

/** `from '../lib/clicks'` in a built-in layout becomes `from 'slide-ng/lib/clicks'` (the app's public path, see docs/THEMES.md). */
export function rewriteImports(source) {
  return source.replace(/from '\.\.\/([\w/-]+)'/g, "from 'slide-ng/$1'");
}

function ejectBuiltIn(target) {
  const from = join(packageRoot, 'src/app/layouts');
  mkdirSync(join(target, 'layouts'), { recursive: true });
  for (const file of readdirSync(from).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'),
  )) {
    writeFileSync(
      join(target, 'layouts', file),
      rewriteImports(readFileSync(join(from, file), 'utf8')),
    );
  }
  // The typography of the layouts, as the theme's own style sheet.
  mkdirSync(join(target, 'styles'), { recursive: true });
  writeFileSync(
    join(target, 'styles', 'index.css'),
    `/* Ejected from the built-in theme: the look of the layouts. Edit freely. */\n${readFileSync(join(packageRoot, 'src/styles/layouts.css'), 'utf8')}`,
  );
  writeFileSync(
    join(target, 'theme.json'),
    JSON.stringify({ name: 'ejected-default', headmatter: {} }, null, 2) + '\n',
  );
}

function ejectFolder(source, target) {
  cpSync(source, target, {
    recursive: true,
    // Never follow links out of the theme, and leave dependencies and git data behind.
    // Only the part below the theme's folder is tested: an installed theme itself lives inside node_modules.
    filter: (path) =>
      !/(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(relative(source, path)) &&
      !lstatSync(path).isSymbolicLink(),
  });
}

export async function themeCommand(argv) {
  const [sub, ...rest] = argv;
  if (sub !== 'eject') throw new Error('Usage: slide-ng theme eject [slides.md] [--dir theme]');
  const { flags, positionals } = parseFlags(rest, {
    dir: { type: 'string' },
    theme: { type: 'string' },
  });
  const entry = resolve(positionals[0] ?? 'slides.md');
  const root = dirname(entry);
  const dirName = flags.dir ?? 'theme';
  if (!/^[\w.-]+$/.test(dirName) || dirName.startsWith('.'))
    throw new Error('--dir must be a plain folder name such as theme');
  const target = join(root, dirName);
  if (existsSync(target) && readdirSync(target).length)
    throw new Error(`${relative(process.cwd(), target) || target} already exists and is not empty`);

  const deck = await parseDeck(entry, undefined, { theme: flags.theme });
  const spec = flags.theme ?? deck.headmatter.theme ?? 'default';
  if (spec === 'none') throw new Error('The theme is "none": there is nothing to eject');
  const source = spec === 'default' ? null : findRootDir(spec, 'theme', root);
  // A theme folder inside the deck can be edited where it is; one elsewhere (a shared folder) is copied like a package.
  const isPath = spec.startsWith('.') || spec.startsWith('/');
  const inDeck =
    source && !relative(root, source).startsWith('..') && !isAbsolute(relative(root, source));
  if (isPath && inDeck) throw new Error(`The theme "${spec}" is already a folder of this deck`);

  mkdirSync(target, { recursive: true });
  if (spec === 'default') ejectBuiltIn(target);
  else ejectFolder(source, target);

  writeFileSync(entry, setHeadmatterKey(readFileSync(entry, 'utf8'), 'theme', `./${dirName}`));
  console.log(
    `Theme "${spec}" ejected to ./${dirName} and set as the deck's theme in ${basename(entry)}.`,
  );
}
