// ````md magic-move  with several ```code``` blocks inside -> <slide-ng-magic-move>.
// Each block is one step. We tokenise every step here and send the tokens (compressed) to the
// component, which animates between the steps with @shikijs/magic-move.
import { toKeyedTokens } from '@shikijs/magic-move/core';
import { codeToTokens, themeOptions } from './highlighter.mjs';
import { cleanTitle, parseInfo, parseOptions } from './meta.mjs';
import { titleIcon } from './title-icon.mjs';
import { extractFences } from '../fences.mjs';
import { attrs, attr } from '../protect.mjs';
import { pack } from '../pack.mjs';

const INFO = /^(?:md|markdown) magic-move\s*(?:\[([^\]]*)\])?\s*(\{[^}]*\})?/;

export const isMagicMove = (fence) => fence.ticks === 4 && INFO.test(fence.info);

// A step: the keyed tokens of one inner code block.
function toStep(fence, defaultLines) {
  const { lang, options } = parseInfo(fence.info);
  const { tokens, bg, fg, rootStyle, themeName } = codeToTokens(fence.code.trimEnd(), lang);
  const salt = JSON.stringify([lang, themeOptions().themes]);
  const lines = options.lines ?? defaultLines;
  return {
    ...toKeyedTokens(fence.code.trimEnd(), tokens, salt, lines),
    bg,
    fg,
    rootStyle,
    themeName,
    lang,
  };
}

export function renderMagicMove(fence, ctx = {}) {
  const [, title = '', optionText = ''] = INFO.exec(fence.info);
  const options = parseOptions(optionText);
  const head = ctx.headmatter ?? {};
  const { fences } = extractFences(fence.code, ctx); // the inner blocks, `<<<` lines included
  const blocks = fences.filter((f) => !f.group);
  if (!blocks.length) {
    console.warn('[slides] a magic-move block needs at least one code block inside');
    return '';
  }
  const defaultLines = options.lines ?? head.lineNumbers ?? false;
  const steps = blocks.map((f) => toStep(f, defaultLines));
  const ranges = blocks.map((f) => parseInfo(f.info).ranges);
  const packed = pack(steps);
  const a = attrs({
    title: cleanTitle(title),
    icon: title ? titleIcon(title) : undefined,
    at: options.at,
    duration: options.duration ?? head.magicMoveDuration,
    noCopy: head.codeCopy === false || head.magicMoveCopy === false || undefined,
  });
  return `<slide-ng-magic-move${a} steps="${packed}" stepRanges="${attr(JSON.stringify(ranges))}"></slide-ng-magic-move>`;
}
