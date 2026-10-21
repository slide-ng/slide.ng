// `{monaco-write}`: the editor saves its text into the file it was loaded from (`<<< ./snippet.ts {monaco-write}`).
// The generator lists the files it found in `.slide-ng/monaco-files.json` as { id: path }. The page sends only an id:
// a file that is not on that list cannot be written, whatever the request says. The list itself is not trusted either:
// each target is checked again here (scripts/lib/monaco-targets.mjs: extension list, no setup, git, package or hidden files).
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { confine, safeWrite } from './auth.mjs';
import { HttpError } from './http-error.mjs';
import { rootFoldersIn, writeTargetProblem } from '../lib/monaco-targets.mjs';

export const MONACO_FILES = '.slide-ng/monaco-files.json';
export const MAX_FILE = 500_000;

function targets(root) {
  try {
    return JSON.parse(readFileSync(join(root, MONACO_FILES), 'utf8'));
  } catch {
    return {};
  }
}

/** `rootDirs`: the folders of the deck's roots (`deck.roots[].dir`), whose index.html goes into the page. */
export function writeMonaco(ctx, id, content, rootDirs) {
  if (typeof content !== 'string' || content.length > MAX_FILE)
    throw new HttpError(413, 'text too large');
  const list = targets(ctx.root);
  if (typeof id !== 'string' || !Object.hasOwn(list, id) || typeof list[id] !== 'string')
    throw new HttpError(404, 'this editor is not writable');
  // The list is a file on disk: check the target again, as if the list were not trusted.
  const folders = rootFoldersIn(ctx.root, rootDirs);
  if (writeTargetProblem(list[id], folders))
    throw new HttpError(403, 'this file cannot be written here');
  const file = confine(ctx.root, list[id], { write: true });
  if (!file || !existsSync(file)) throw new HttpError(403, 'the file is not in the project');
  // Again by its real place, as the roots' folders are real paths (a linked folder is not another name for one).
  if (writeTargetProblem(relative(realpathSync(ctx.root), realpathSync(file)), folders))
    throw new HttpError(403, 'this file cannot be written here');
  safeWrite(file, content.endsWith('\n') ? content : `${content}\n`);
}
