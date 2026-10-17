// ```ts {monaco}, {monaco-diff} and {monaco-run} -> <slide-ng-monaco> editor component (src/app/code/monaco-editor.ts).
// The code travels packed, because code is full of braces and quotes.
import { parseMonacoInfo } from './meta.mjs';
import { createHash } from 'node:crypto';
import { relative } from 'node:path';
import { attrs } from '../protect.mjs';
import { pack } from '../pack.mjs';
import { writeTargetProblem } from '../monaco-targets.mjs';

// `{monaco-write}` editors, as { id: file path in the project }. The generator saves this list next to the deck
// and the dev server writes only to files on it (scripts/dev/monaco-write.mjs): the page sends an id, never a path.
const writeTargets = {};
export const monacoWriteTargets = () => ({ ...writeTargets });
export const resetMonacoWriteTargets = () => {
  for (const k of Object.keys(writeTargets)) delete writeTargets[k];
};

/** The id of an editor that saves to `file`, or undefined (and a warning) when it cannot. */
function writeIdFor(fence, ctx) {
  if (!fence.file || fence.partial) {
    console.warn(
      `[slides] ${ctx.slide ? `slide ${ctx.slide.no}: ` : ''}{monaco-write} needs a whole file: use \`<<< ./file.ts {monaco-write}\` (not a #region), the editor is shown without saving`,
    );
    return undefined;
  }
  const path = relative(ctx.root ?? '.', fence.file);
  if (path.startsWith('..')) {
    console.warn(
      `[slides] {monaco-write}: ${fence.file} is outside the project, the editor is shown without saving`,
    );
    return undefined;
  }
  const problem = writeTargetProblem(path);
  if (problem) {
    console.warn(
      `[slides] {monaco-write}: ${path} cannot be written (${problem}), the editor is shown without saving`,
    );
    return undefined;
  }
  const id = createHash('sha1').update(path).digest('hex').slice(0, 12);
  writeTargets[id] = path;
  return id;
}

export const isMonaco = (fence) => parseMonacoInfo(fence.info) !== null;

// Original and modified text of a diff are separated by a line with `~~~`.
const DIFF_SEPARATOR = /^\s*~~~\s*\n/m;

export function renderMonaco(fence, ctx = {}) {
  const { lang, kind, options } = parseMonacoInfo(fence.info);
  const writeId = kind === 'monaco-write' ? writeIdFor(fence, ctx) : undefined;
  const [original, modified] = (
    kind === 'monaco-diff' ? fence.code.split(DIFF_SEPARATOR, 2) : [fence.code]
  ).map((s) => s.trimEnd());
  const a = attrs({
    lang,
    runnable: kind === 'monaco-run' || undefined,
    lines: options.lines ?? ctx.headmatter?.lineNumbers,
    readonly: options.readonly,
    'write-id': writeId,
    height: options.height,
    autorun: options.autorun === undefined ? undefined : String(options.autorun),
    showOutputAt: options.showOutputAt,
  });
  if (kind === 'monaco-diff' && modified === undefined)
    console.warn(
      `[slides] ${ctx.slide ? `slide ${ctx.slide.no}: ` : ''}{monaco-diff} has no line with only ~~~ between the original and the changed text, so it shows one editor`,
    );
  const diff = modified === undefined ? '' : ` diff="${pack(modified)}"`;
  return `<slide-ng-monaco${a} packed="${pack(original)}"${diff}></slide-ng-monaco>`;
}
