// The icon in front of a code block, code group or Magic Move title. Port of Slidev's TitleIcon.vue:
// `~i-logos:vue~` in the title names the icon; otherwise a known name in the title (`npm`, `package.json`, `.ts`, ...)
// picks one from @iconify-json/vscode-icons, but only when that set is installed (an icon of a missing set draws nothing).
import { nearest } from '../did-you-mean.mjs';
import { iconNames, installedSets } from '../icons.mjs';
import { warnSlidePrefix } from './highlighter.mjs';

// Slidev's table, as written in TitleIcon.vue (two of its entries lacked the `i-` prefix; it is added here).
const BUILTIN_ICONS = {
  // package managers
  pnpm: 'i-vscode-icons:file-type-light-pnpm',
  npm: 'i-vscode-icons:file-type-npm',
  yarn: 'i-vscode-icons:file-type-yarn',
  bun: 'i-vscode-icons:file-type-bun',
  deno: 'i-vscode-icons:file-type-deno',
  // frameworks
  vue: 'i-vscode-icons:file-type-vue',
  svelte: 'i-vscode-icons:file-type-svelte',
  angular: 'i-vscode-icons:file-type-angular',
  react: 'i-vscode-icons:file-type-reactjs',
  next: 'i-vscode-icons:file-type-light-next',
  nuxt: 'i-vscode-icons:file-type-nuxt',
  solid: 'i-logos:solidjs-icon',
  astro: 'i-vscode-icons:file-type-light-astro',
  // bundlers
  rollup: 'i-vscode-icons:file-type-rollup',
  webpack: 'i-vscode-icons:file-type-webpack',
  vite: 'i-vscode-icons:file-type-vite',
  esbuild: 'i-vscode-icons:file-type-esbuild',
  // configuration files
  'package.json': 'i-vscode-icons:file-type-node',
  'tsconfig.json': 'i-vscode-icons:file-type-tsconfig',
  '.npmrc': 'i-vscode-icons:file-type-npm',
  '.editorconfig': 'i-vscode-icons:file-type-editorconfig',
  '.eslintrc': 'i-vscode-icons:file-type-eslint',
  '.eslintignore': 'i-vscode-icons:file-type-eslint',
  'eslint.config': 'i-vscode-icons:file-type-eslint',
  '.gitignore': 'i-vscode-icons:file-type-git',
  '.gitattributes': 'i-vscode-icons:file-type-git',
  '.env': 'i-vscode-icons:file-type-dotenv',
  '.env.example': 'i-vscode-icons:file-type-dotenv',
  '.vscode': 'i-vscode-icons:file-type-vscode',
  'tailwind.config': 'i-vscode-icons:file-type-tailwind',
  'uno.config': 'i-vscode-icons:file-type-unocss',
  'unocss.config': 'i-vscode-icons:file-type-unocss',
  '.oxlintrc': 'i-vscode-icons:file-type-oxlint',
  'vue.config': 'i-vscode-icons:file-type-vueconfig',
  // filename extensions
  '.mts': 'i-vscode-icons:file-type-typescript',
  '.cts': 'i-vscode-icons:file-type-typescript',
  '.ts': 'i-vscode-icons:file-type-typescript',
  '.tsx': 'i-vscode-icons:file-type-typescript',
  '.mjs': 'i-vscode-icons:file-type-js',
  '.cjs': 'i-vscode-icons:file-type-js',
  '.json': 'i-vscode-icons:file-type-json',
  '.js': 'i-vscode-icons:file-type-js',
  '.jsx': 'i-vscode-icons:file-type-js',
  '.md': 'i-vscode-icons:file-type-markdown',
  '.py': 'i-vscode-icons:file-type-python',
  '.ico': 'i-vscode-icons:file-type-favicon',
  '.html': 'i-vscode-icons:file-type-html',
  '.css': 'i-vscode-icons:file-type-css',
  '.scss': 'i-vscode-icons:file-type-scss',
  '.yml': 'i-vscode-icons:file-type-light-yaml',
  '.yaml': 'i-vscode-icons:file-type-light-yaml',
  '.php': 'i-vscode-icons:file-type-php',
  '.svg': 'i-vscode-icons:file-type-svg',
};

// The longest name first, as in Slidev, so `package.json` wins over `.json` and `.tsx` over `.ts`.
const NAMES = Object.keys(BUILTIN_ICONS).sort((a, b) => b.length - a.length);

// Does a word of the title (a file name, a path part or a plain word) name this entry? Slidev looks for the name anywhere in
// the title, so `results.tsv` got the TypeScript icon; here a name has to be the whole word, its extension (`.ts`, and `vue`
// for `App.vue`) or the start of a file name before its extension (`eslint.config.js`, `.eslintrc.json`).
function names(word, name) {
  if (word === name || word.startsWith(name + '.')) return true;
  return word.endsWith(name.startsWith('.') ? name : '.' + name) && !name.includes('.', 1);
}

/**
 * The icon class for a title, or ''. The first `~...~` is used as it is; a built-in match only when its set is installed.
 * @param {string} title @param {string[]} [sets] the installed @iconify-json sets
 */
export function titleIcon(title, sets) {
  const written = /~([^~]+)~/.exec(title);
  if (written) return written[1].trim();
  const words = title
    .toLowerCase()
    .split(/[\s/\\]+/)
    .map((w) => w.replace(/^[^\w.]+|[^\w.]+$/g, ''))
    .filter(Boolean);
  const name = NAMES.find((n) => words.some((w) => names(w, n)));
  if (!name) return '';
  const icon = BUILTIN_ICONS[name];
  const set = /^i-([^:]+):/.exec(icon)[1];
  return (sets ?? installedSets()).includes(set) ? icon : '';
}

/**
 * Why the `~icon~` written in a title draws nothing, or ''. Only an icon of an installed set is checked (its name is not
 * in the set); a set that is not installed may still be a collection of the deck's own UnoCSS setup.
 * @param {string} title @param {(set: string) => Set<string> | null} [names] the names of an installed set
 */
export function titleIconProblem(title, names = iconNames) {
  const written = /~([^~]+)~/.exec(title);
  const icon = written?.[1].trim() ?? '';
  const parts = /^i-([a-z0-9-]+):([a-z0-9-]+)$/.exec(icon);
  if (!parts) return '';
  const [, set, name] = parts;
  const known = names(set);
  if (!known || known.has(name)) return '';
  // A name a letter or two away (`bukcet`), or a variant of the whole name (`bucket` -> `bucket-2`); not a name that only
  // shares the first letters (`not-an-mdi-icon` is not `no`).
  const typo = nearest(name, known);
  const near = typo
    ? [typo]
    : [...known]
        .filter((n) => n.startsWith(`${name}-`))
        .sort((a, b) => a.length - b.length || a.localeCompare(b))
        .slice(0, 3);
  return `the code title icon "${icon}" is not in the installed ${set} icon set, so nothing is drawn${near.length ? ` (did you mean ${near.map((n) => `"i-${set}:${n}"`).join(', ')}?)` : ''}`;
}

/** Warns about a `~icon~` in a code title that draws nothing (an icon its installed set does not have). */
export function warnTitleIcon(title) {
  const problem = title ? titleIconProblem(title) : '';
  if (problem) console.warn(`[slides] ${warnSlidePrefix()}${problem}`);
}
