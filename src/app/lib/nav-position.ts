// The headmatter's `navPosition` (slide.ng's own): where the navigation bar sits on the slide page. `left` and `right` are
// the start and end of the writing direction, so a right-to-left deck mirrors them, like the rest of the bar. The same
// list is checked by the generator (scripts/lib/parse-deck.mjs), which warns about any other value. A viewer can choose
// another place in the settings menu (ViewPrefs.navPosition); that choice wins over the headmatter in their browser.
import { HEADMATTER } from '../../slides/generated';

export const NAV_POSITIONS = [
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'top-left',
  'top-center',
  'top-right',
] as const;

export type NavPositionName = (typeof NAV_POSITIONS)[number];

export const isNavPosition = (value: unknown): value is NavPositionName =>
  (NAV_POSITIONS as readonly unknown[]).includes(value);

export interface NavPosition {
  edge: 'top' | 'bottom';
  side: 'start' | 'center' | 'end';
}

const SIDES = { left: 'start', center: 'center', right: 'end' } as const;

/** The place of `value`; anything not in the list is the bottom left, as in Slidev. */
export function readNavPosition(value: unknown): NavPosition {
  const name = isNavPosition(value) ? value : 'bottom-left';
  const [edge, side] = name.split('-') as ['top' | 'bottom', keyof typeof SIDES];
  return { edge, side: SIDES[side] };
}

/** The deck's own place (the headmatter's, else the bottom left). */
export const deckNavPosition = (): NavPositionName =>
  isNavPosition(HEADMATTER['navPosition']) ? HEADMATTER['navPosition'] : 'bottom-left';

/** Where the bar sits: the viewer's `chosen` place (null when they chose none), else the deck's own. */
export const navPosition = (chosen: unknown = null): NavPosition =>
  readNavPosition(isNavPosition(chosen) ? chosen : deckNavPosition());

/**
 * The place an arrow key moves to in the 2 x 3 grid of the settings menu, or null for another key. The grid follows the
 * writing direction, so in a right-to-left page ArrowRight goes towards `left` (the start), which is on the right there.
 * The arrows stop at the edges.
 */
export function navPositionStep(
  from: NavPositionName,
  key: string,
  rtl: boolean,
): NavPositionName | null {
  const i = NAV_POSITIONS.indexOf(from);
  const row = i < 3 ? 0 : 1; // 0 is the bottom row, 1 the top one
  const col = i % 3;
  const forward = rtl ? -1 : 1;
  const step: Record<string, [number, number]> = {
    ArrowLeft: [0, -forward],
    ArrowRight: [0, forward],
    ArrowUp: [1, 0],
    ArrowDown: [-1, 0],
  };
  const by = step[key];
  if (!by) return null;
  const r = Math.min(Math.max(row + by[0], 0), 1);
  const c = Math.min(Math.max(col + by[1], 0), 2);
  return NAV_POSITIONS[r * 3 + c];
}

export function navPositionAt(
  x: number,
  y: number,
  w: number,
  h: number,
  rtl: boolean,
): NavPositionName | null {
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const col = Math.floor((x / w) * 3);
  const row = y < h / 2 ? 1 : 0;
  return NAV_POSITIONS[row * 3 + (rtl ? 2 - col : col)];
}
