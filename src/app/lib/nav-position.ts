// The headmatter's `navPosition` (slide.ng's own): where the navigation bar sits on the slide page. `left` and `right` are
// the start and end of the writing direction, so a right-to-left deck mirrors them, like the rest of the bar. The same
// list is checked by the generator (scripts/lib/parse-deck.mjs), which warns about any other value.
import { HEADMATTER } from '../../slides/generated';

export const NAV_POSITIONS = [
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'top-left',
  'top-center',
  'top-right',
] as const;

export interface NavPosition {
  edge: 'top' | 'bottom';
  side: 'start' | 'center' | 'end';
}

const SIDES = { left: 'start', center: 'center', right: 'end' } as const;

/** The place of `value`; anything not in the list is the bottom left, as in Slidev. */
export function readNavPosition(value: unknown): NavPosition {
  const name = (NAV_POSITIONS as readonly unknown[]).includes(value)
    ? (value as string)
    : 'bottom-left';
  const [edge, side] = name.split('-') as ['top' | 'bottom', keyof typeof SIDES];
  return { edge, side: SIDES[side] };
}

export const navPosition = (): NavPosition => readNavPosition(HEADMATTER['navPosition']);
