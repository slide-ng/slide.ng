// Which files `{monaco-write}` may save into. The generator checks this when it lists a file, and the dev server checks it
// again at every write, so a list edited in between (or by a request) cannot name anything else.
// A file qualifies when it is inside the deck's folder, has a plain text-like extension, and is not code that the tools
// themselves load or run: setup files, layouts, components, themes and the index.html of the deck and of each theme or
// addon folder in it, config files, git and package files, hidden files.
import { realpathSync } from 'node:fs';
import { basename, extname, isAbsolute, normalize, relative, resolve, sep } from 'node:path';

export const WRITABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.jsonc', '.css', '.scss', '.html', '.md', '.txt',
  '.yaml', '.yml', '.toml', '.xml', '.sql', '.py', '.rb', '.php', '.go', '.rs', '.java',
  '.kt', '.swift', '.c', '.h', '.cpp', '.cs', '.diff', '.patch',
]); // prettier-ignore

// The first folder of the path: these hold code that the generator or the app loads.
const DENIED_FOLDERS = new Set([
  'setup', 'layouts', 'components', 'layers', 'styles', 'public', 'theme', 'addons',
  'node_modules', 'dist', 'scripts', 'src',
]); // prettier-ignore

const DENIED_NAMES =
  /^(package(-lock)?\.json|npm-shrinkwrap\.json|.*\.lock|.*\.lockb|.*-lock\.ya?ml|(tsconfig|angular|theme|deno)[\w.-]*\.json|.*\.config\.[\w]+)$/i;

// A folder as `a/b`, lower case (the same folder on a disk that ignores case).
const folderKey = (path) =>
  normalize(path)
    .split(sep)
    .filter((p) => p && p !== '.')
    .join('/')
    .toLowerCase();

/** The folders of the roots (`deck.roots[].dir`) that are inside the deck's folder, relative to it. */
export function rootFoldersIn(deckRoot, dirs) {
  let base = resolve(deckRoot);
  try {
    base = realpathSync(base); // the roots' folders are real paths
  } catch {
    // a folder that is not there: compare as written
  }
  return dirs
    .filter(Boolean)
    .map((dir) => relative(base, dir))
    .filter((rel) => !rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Why `relPath` (relative to the deck's folder) may not be written by `{monaco-write}`, or null when it may.
 * `rootFolders`: the theme and addon folders inside the deck's folder, relative to it (rootFoldersIn).
 */
export function writeTargetProblem(relPath, rootFolders = []) {
  if (typeof relPath !== 'string' || !relPath || relPath.includes('\0')) return 'not a file name';
  if (isAbsolute(relPath)) return 'outside the project';
  const parts = normalize(relPath).split(sep);
  if (parts.includes('..')) return 'outside the project';
  if (parts.some((p) => p.startsWith('.'))) return 'a hidden file or folder';
  if (parts.some((p) => p.toLowerCase() === 'node_modules')) return 'in node_modules';
  // At the top of the deck's folder and of each theme or addon folder in it.
  const lower = parts.map((p) => p.toLowerCase());
  for (const root of ['', ...rootFolders]) {
    const top = folderKey(root).split('/').filter(Boolean);
    const inside = top.every((p, i) => lower[i] === p);
    if (inside && parts.length > top.length + 1 && DENIED_FOLDERS.has(lower[top.length]))
      return `in the ${parts[top.length]}/ folder, which holds code the tools load`;
  }
  const name = basename(relPath);
  // The index.html of the deck and of each theme or addon is merged into the page (lib/index-html.mjs), scripts and all.
  if (name.toLowerCase() === 'index.html') {
    const folder = folderKey(parts.slice(0, -1).join(sep));
    if (['', ...rootFolders].some((root) => folderKey(root) === folder))
      return 'the index.html of the deck, a theme or an addon, which goes into the page';
  }
  if (DENIED_NAMES.test(name)) return 'a package, lock or config file';
  if (!WRITABLE_EXTENSIONS.has(extname(name).toLowerCase()))
    return `the extension "${extname(name) || 'none'}" is not in the list of writable ones`;
  return null;
}
