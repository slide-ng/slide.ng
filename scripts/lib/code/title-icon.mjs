// The icon in front of a code block, code group or Magic Move title. Port of Slidev's TitleIcon.vue:
// `~i-logos:vue~` in the title names the icon; otherwise a known name in the title (`npm`, `package.json`, `.ts`, ...)
// picks one from @iconify-json/vscode-icons, but only when that set is installed (an icon of a missing set draws nothing).
import { installedSets } from '../icons.mjs';

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

/**
 * The icon class for a title, or ''. The first `~...~` is used as it is; a built-in match only when its set is installed.
 * @param {string} title @param {string[]} [sets] the installed @iconify-json sets
 */
export function titleIcon(title, sets) {
  const written = /~([^~]+)~/.exec(title);
  if (written) return written[1].trim();
  const lower = title.toLowerCase();
  const name = NAMES.find((n) => lower.includes(n));
  if (!name) return '';
  const icon = BUILTIN_ICONS[name];
  const set = /^i-([^:]+):/.exec(icon)[1];
  return (sets ?? installedSets()).includes(set) ? icon : '';
}
