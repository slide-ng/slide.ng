// UnoCSS settings. Called from scripts/lib/make-css.mjs.
//   - preset-wind3: the usual utility classes (flex, px-4, text-center, ...); `dark:` follows the `dark` class on <html>.
//   - preset-icons: `i-carbon:maximize` style icons from the Carbon set (the same icons Slidev uses).
//   - preset-attributify: utilities as attributes, `<div flex="~ col" text="sm white" hover:bg="white op-10">`, as in Slidev.
//   - preset-typography: `prose` for long text.
//   - shortcuts: a few of Slidev's names (bg-main, text-primary, z-nav, ...).
// Variant groups (`hover:(a b)`) and the CSS directives (`@apply`, `--uno:`) are applied by the generator (lib/uno-directives.mjs).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { presetAttributify } from '@unocss/preset-attributify';
import { presetIcons } from '@unocss/preset-icons';
import { presetTypography } from '@unocss/preset-typography';
import { presetWind3 } from '@unocss/preset-wind3';

// The installed @iconify-json sets, given to preset-icons as collections of its own. Its Node loader is not used: it is
// skipped whenever VSCODE_CWD is set (every VS Code terminal sets it, so no icon was drawn there), and it only looks from
// the current folder. The sets are looked for the way Node finds a package, from the current folder (the app in
// <deck>/.slide-ng/app, so a deck's own sets count) and from slide.ng's folder, up to the root; on each use, so a set
// installed while `slide-ng dev` runs is found too.
const starts = [process.cwd(), dirname(fileURLToPath(import.meta.url))];
function* iconDirs() {
  for (const start of starts)
    for (let at = resolve(start); ; at = dirname(at)) {
      yield join(at, 'node_modules', '@iconify-json');
      if (dirname(at) === at) break;
    }
}
const setFile = (set) => {
  for (const dir of iconDirs()) {
    const file = join(dir, set, 'icons.json');
    if (existsSync(file)) return file;
  }
  return null;
};
const parsed = new Map();
const readSet = (file) => {
  const stamp = statSync(file).mtimeMs;
  const known = parsed.get(file);
  if (known?.stamp === stamp) return known.json;
  const json = JSON.parse(readFileSync(file, 'utf8'));
  parsed.set(file, { stamp, json });
  return json;
};
const setNames = () => {
  const names = new Set();
  for (const dir of iconDirs())
    if (existsSync(dir)) for (const set of readdirSync(dir)) names.add(set);
  return [...names].filter((set) => setFile(set));
};
export const iconCollections = new Proxy(
  {},
  {
    get: (_, set) => {
      const file = typeof set === 'string' ? setFile(set) : null;
      return file ? () => readSet(file) : undefined;
    },
    has: (_, set) => typeof set === 'string' && !!setFile(set),
    ownKeys: () => setNames(),
    getOwnPropertyDescriptor: (_, set) =>
      typeof set === 'string' && setFile(set)
        ? { enumerable: true, configurable: true, value: () => readSet(setFile(set)) }
        : undefined,
  },
);

export default {
  presets: [
    presetWind3({ dark: 'class' }),
    presetAttributify(),
    presetIcons({
      collections: iconCollections,
      scale: 1.2,
      extraProperties: { display: 'inline-block', 'vertical-align': 'middle' },
    }),
    presetTypography(),
  ],
  shortcuts: {
    'bg-main': 'bg-white dark:bg-[#121212]',
    'bg-active': 'bg-gray-400/10',
    'border-main': 'border-gray/20',
    'text-main': 'text-[#181818] dark:text-[#ddd]',
    'text-primary': 'color-$slidev-theme-primary',
    'bg-primary': 'bg-$slidev-theme-primary',
    'border-primary': 'border-$slidev-theme-primary',
    'abs-tl': 'absolute top-0 left-0',
    'abs-tr': 'absolute top-0 right-0',
    'abs-b': 'absolute bottom-0 left-0 right-0',
    'abs-bl': 'absolute bottom-0 left-0',
    'abs-br': 'absolute bottom-0 right-0',
    'z-drawing': 'z-10',
    'z-camera': 'z-15',
    'z-dragging': 'z-18',
    'z-menu': 'z-20',
    'z-label': 'z-40',
    'z-nav': 'z-50',
    'z-context-menu': 'z-60',
    'z-modal': 'z-70',
    'z-focus-indicator': 'z-200',
    'slidev-glass-effect': 'shadow-xl backdrop-blur-8 border border-main bg-main bg-opacity-75!',
  },
  // `forward:` and `backward:` only apply while navigating in that direction (the deck sets the class).
  variants: [
    (matcher) => {
      const dir = ['forward', 'backward'].find((d) => matcher.startsWith(`${d}:`));
      if (!dir) return matcher;
      return {
        matcher: matcher.slice(dir.length + 1),
        selector: (s) => `.slidev-nav-go-${dir} ${s}`,
      };
    },
  ],
  safelist: ['!opacity-0'],
};
