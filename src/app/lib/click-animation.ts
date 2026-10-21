// Click animation presets (Slidev's `clickAnimation` and `v-click.fade.right`): an element that appears on a click gets the class
// `slidev-vclick-anim-<name>` for each preset, and the CSS of that class (styles.css, or the deck's own) says how it looks while
// hidden. The element's own presets win; otherwise the slide's `clickAnimation`, then the headmatter's.
import { inject } from '@angular/core';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { SLIDE_NO } from './slide-context';

export const CLICK_ANIMATION_PREFIX = 'slidev-vclick-anim-';

/** `fade right`, `fade,right`, `fade.right` or a list -> the preset names. */
export function presetNames(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return list.flatMap((v) => String(v).split(/[\s,.]+/)).filter(Boolean);
}

/** The presets of one element: its own, or the slide's `clickAnimation`, or the headmatter's. */
export function clickPresets(
  own: unknown,
  frontmatter: Record<string, unknown> | undefined,
  headmatter: Record<string, unknown>,
): string[] {
  const names = presetNames(own);
  if (names.length) return names;
  return presetNames(frontmatter?.['clickAnimation'] || headmatter['clickAnimation']);
}

/** For a directive or component inside a slide (an injection context): the classes for `own` presets on this slide. */
export function clickAnimationClasses(): (own: unknown) => string[] {
  const frontmatter = SLIDES[inject(SLIDE_NO) - 1]?.frontmatter;
  return (own) =>
    clickPresets(own, frontmatter, HEADMATTER).map((name) => CLICK_ANIMATION_PREFIX + name);
}
