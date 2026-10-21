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

// The headmatter's `shiki.magicMove` options that Slidev hands to the renderer and the differ, with their types.
const OPTION_TYPES = {
  duration: 'number',
  stagger: 'number',
  delayMove: 'number',
  delayLeave: 'number',
  delayEnter: 'number',
  delayContainer: 'number',
  easing: 'string',
  animateContainer: 'boolean',
  containerStyle: 'boolean',
  splitTokens: 'boolean',
  enhanceMatching: 'boolean',
};

// Keeps the known options of the right type; anything else is left out with a warning.
export function magicMoveOptions(value) {
  if (value == null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) {
    console.warn('[slides] shiki.magicMove must be an object of options');
    return {};
  }
  const options = {};
  for (const [key, v] of Object.entries(value)) {
    if (!(key in OPTION_TYPES))
      console.warn(`[slides] shiki.magicMove.${key} is not a Magic Move option`);
    else if (typeof v !== OPTION_TYPES[key])
      console.warn(`[slides] shiki.magicMove.${key} must be a ${OPTION_TYPES[key]}`);
    else options[key] = v;
  }
  return options;
}

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
  // The duration is its own input, so the block's `{duration}` and `magicMoveDuration` win over `shiki.magicMove.duration`.
  const { duration, ...moveOptions } = magicMoveOptions(head.shiki?.magicMove);
  const a = attrs({
    title: cleanTitle(title),
    icon: title ? titleIcon(title) : undefined,
    at: options.at,
    duration: options.duration ?? head.magicMoveDuration ?? duration,
    noCopy: head.codeCopy === false || head.magicMoveCopy === false || undefined,
    options: Object.keys(moveOptions).length ? JSON.stringify(moveOptions) : undefined,
  });
  return `<slide-ng-magic-move${a} steps="${packed}" stepRanges="${attr(JSON.stringify(ranges))}"></slide-ng-magic-move>`;
}
