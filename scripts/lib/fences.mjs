// Finds the code fences in a slide's markdown and sets them aside, so the markdown
// converter never sees them. Also expands `<<< file` snippet lines and `::code-group` blocks,
// which are made of fences. Each one is replaced by a line `NGFENCE<n>X`.
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { SNIPPET_LINE, resolveSnippet } from './code/snippet.mjs';
import { OutsideRootError } from './outside-root.mjs';

// A fence may be indented, as inside a list item; its lines lose that indent and the placeholder keeps it.
const OPEN = /^([ \t]*)(`{3,})(.*)$/;
const CLOSE = /^[ \t]*(`{3,})[ \t]*$/;
const GROUP_OPEN = /^:{2,}code-group[ \t]*$/;
const GROUP_CLOSE = /^:{2,}[ \t]*$/;

// ctx: { file, root } say where `<<<` paths start from.
export function extractFences(markdown, ctx = {}) {
  const fences = [];
  const out = [];
  let open = null; // the fence being read: { ticks, info, lines, indent }
  let group = null; // the code group being read: its fences so far

  const finish = (fence, indent = '') => {
    if (group) group.push(fence);
    else out.push(`\n${indent}NGFENCE${fences.push(fence) - 1}X\n`);
  };
  const outdent = (line, indent) =>
    line.startsWith(indent) ? line.slice(indent.length) : line.trimStart();

  for (const line of markdown.replace(/\r/g, '').split('\n')) {
    if (open) {
      const close = CLOSE.exec(line);
      if (close && close[1].length >= open.ticks) {
        finish({ ticks: open.ticks, info: open.info, code: open.lines.join('\n') }, open.indent);
        open = null;
      } else open.lines.push(outdent(line, open.indent));
    } else if (OPEN.test(line)) {
      const [, indent, ticks, info] = OPEN.exec(line);
      open = { ticks: ticks.length, info: info.trim(), lines: [], indent };
    } else if (SNIPPET_LINE.test(line)) {
      const snippet = resolveSafe(line, ctx);
      if (snippet)
        finish({
          ticks: 3,
          info: `${snippet.lang} ${snippet.meta}`.trim(),
          code: snippet.code,
          file: snippet.path,
          partial: snippet.partial,
        });
    } else if (!group && GROUP_OPEN.test(line)) {
      group = [];
    } else if (group && GROUP_CLOSE.test(line)) {
      out.push(`\nNGFENCE${fences.push({ group }) - 1}X\n`);
      group = null;
    } else if (!group) out.push(line); // text between the fences of a group is dropped
  }
  // An unclosed fence or group keeps what was read, as markdown does.
  if (open)
    finish({ ticks: open.ticks, info: open.info, code: open.lines.join('\n') }, open.indent);
  if (group) out.push(`\nNGFENCE${fences.push({ group }) - 1}X\n`);
  return { markdown: out.join('\n'), fences };
}

// A missing file becomes a visible code block and a warning, not a crash.
function resolveSafe(line, ctx) {
  try {
    return resolveSnippet(line, ctx.file ?? 'slides.md', ctx.root ?? '.', {
      roots: ctx.roots,
      allowOutsideRoot: ctx.allowOutsideRoot,
    });
  } catch (e) {
    if (e instanceof OutsideRootError) throw e; // a deck that reads outside its folder stops the build
    console.warn(`[slides] ${slideWhere(ctx, line)}${e.message}`);
    return { code: `// ${e.message}`, lang: 'text', meta: '' };
  }
}

/**
 * `slide N (parts/a.md:12): ` for a warning about the slide being generated: its number and the line of the file that has
 * `text` (the first line of it that is found), or less when that is not known.
 * @param {{ file?: string, root?: string, slide?: { no: number, source?: { filepath?: string, contentStart?: number, end?: number } } }} ctx
 */
export function slideWhere(ctx, text) {
  if (!ctx.slide) return '';
  let at = '';
  if (ctx.file) {
    const name = relative(ctx.root ?? '.', ctx.file).replace(/\\/g, '/') || 'slides.md';
    let line = -1;
    try {
      const needle = String(text ?? '')
        .trim()
        .split('\n')[0]
        .trim();
      const lines = readFileSync(ctx.file, 'utf8').replace(/\r/g, '').split('\n');
      // Look in the slide's own lines first: the same text (a `\begin{aligned}`, a snippet line) may be in an earlier slide.
      const own = ctx.slide.source?.filepath === ctx.file ? ctx.slide.source : null;
      const from = own?.contentStart ?? 0;
      const to = own?.end ?? lines.length;
      if (needle) {
        line = lines.findIndex((l, i) => i >= from && i < to && l.includes(needle));
        if (line < 0) line = lines.findIndex((l) => l.includes(needle));
      }
    } catch {
      // the file is not readable: the name is enough
    }
    at = ` (${name}${line >= 0 ? `:${line + 1}` : ''})`;
  }
  return `slide ${ctx.slide.no}${at}: `;
}
