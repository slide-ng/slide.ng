// Which files `{monaco-write}` may save into. The generator checks this when it lists a file, and the dev server checks it
// again at every write, so a list edited in between (or by a request) cannot name anything else.
// A file qualifies when it is inside the deck's folder, has a plain text-like extension, and is not code that the tools
// themselves load or run: setup files, layouts, components, themes, the deck's index.html, config files, git and package files,
// hidden files.
import { basename, extname, isAbsolute, normalize, sep } from 'node:path';

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

/** Why `relPath` (relative to the deck's folder) may not be written by `{monaco-write}`, or null when it may. */
export function writeTargetProblem(relPath) {
  if (typeof relPath !== 'string' || !relPath || relPath.includes('\0')) return 'not a file name';
  if (isAbsolute(relPath)) return 'outside the project';
  const parts = normalize(relPath).split(sep);
  if (parts.includes('..')) return 'outside the project';
  if (parts.some((p) => p.startsWith('.'))) return 'a hidden file or folder';
  if (parts.some((p) => p.toLowerCase() === 'node_modules')) return 'in node_modules';
  if (parts.length > 1 && DENIED_FOLDERS.has(parts[0].toLowerCase()))
    return `in the ${parts[0]}/ folder, which holds code the tools load`;
  const name = basename(relPath);
  // The deck's own index.html is merged into the page (lib/index-html.mjs), scripts and all.
  if (parts.length === 1 && name.toLowerCase() === 'index.html')
    return "the deck's index.html, which goes into the page";
  if (DENIED_NAMES.test(name)) return 'a package, lock or config file';
  if (!WRITABLE_EXTENSIONS.has(extname(name).toLowerCase()))
    return `the extension "${extname(name) || 'none'}" is not in the list of writable ones`;
  return null;
}
