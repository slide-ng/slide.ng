// The arithmetic of slide-ng-drag, without any browser code, so it can be tested on its own.
// All numbers are canvas pixels (the slide canvas), never screen pixels: the caller divides pointer movement by the scale.

/** A box on the slide. `h` is NaN when the height follows the content. `rot` is degrees. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
}
/** An arrow from one point to another. */
export interface Arrow {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export type Corner = 'nw' | 'ne' | 'sw' | 'se';

const MIN_SIZE = 10;

/** Text such as `[10,20,30,40]`, `10,20,30,_` or `10, 20, 30, NaN, 15` -> numbers. `_`, `NaN` and empty mean "automatic". */
function numbers(text: string): number[] | null {
  const values: number[] = [];
  for (const part of text
    .trim()
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((v) => v.trim())) {
    if (part === '' || part === '_' || part === 'NaN') {
      values.push(NaN);
      continue;
    }
    const n = Number(part);
    if (Number.isNaN(n)) return null;
    values.push(n);
  }
  return values;
}

export function parseBox(text: string): Box | null {
  const n = numbers(text);
  if (!n || n.length < 3 || n.length > 5 || [n[0], n[1], n[2]].some(Number.isNaN)) return null;
  return { x: n[0], y: n[1], w: n[2], h: n[3] ?? NaN, rot: Number.isNaN(n[4]) ? 0 : (n[4] ?? 0) };
}

/** An arrow's text is `x,y,width,height` as in Slidev's v-drag-arrow: from (x, y) to (x + width, y + height); a size may be negative. */
export function parseArrow(text: string): Arrow | null {
  const n = numbers(text);
  if (!n || n.length !== 4 || n.some(Number.isNaN)) return null;
  return { x1: n[0], y1: n[1], x2: n[0] + n[2], y2: n[1] + n[3] };
}

const round = (v: number) => Math.round(v);
const auto = (v: number, mark: string) => (Number.isNaN(v) ? mark : String(round(v)));

/**
 * The text written into slides.md. `array` is the `slide-ng-drag="[x,y,w,h]"` spelling (NaN for automatic height),
 * `plain` is `pos="x,y,w,h"` and the frontmatter spelling (`_`). The rotation is only written when there is one.
 */
export function formatBox(b: Box, style: 'array' | 'plain'): string {
  const mark = style === 'array' ? 'NaN' : '_';
  const list = [
    round(b.x),
    round(b.y),
    round(b.w),
    auto(b.h, mark),
    ...(b.rot ? [round(b.rot)] : []),
  ];
  return style === 'array' ? `[${list.join(',')}]` : list.join(',');
}

export const formatArrow = (a: Arrow): string =>
  [a.x1, a.y1, a.x2 - a.x1, a.y2 - a.y1].map(round).join(',');

export const moveBox = (b: Box, dx: number, dy: number): Box => ({
  ...b,
  x: b.x + dx,
  y: b.y + dy,
});

/** Drag a corner; the opposite corner stays where it is. `keepRatio` (Shift) keeps the shape. `b.h` must be a number here. */
export function resizeBox(b: Box, corner: Corner, dx: number, dy: number, keepRatio = false): Box {
  const west = corner.includes('w'),
    north = corner.startsWith('n');
  let w = Math.max(MIN_SIZE, b.w + (west ? -dx : dx));
  let h = Math.max(MIN_SIZE, b.h + (north ? -dy : dy));
  if (keepRatio) {
    // Follow whichever side moved more, and give the other the same proportion.
    const ratio = b.w / b.h;
    if (Math.abs(dx) >= Math.abs(dy) * ratio) h = w / ratio;
    else w = h * ratio;
  }
  return { ...b, x: west ? b.x + b.w - w : b.x, y: north ? b.y + b.h - h : b.y, w, h };
}

/** The angle (degrees) that makes the handle above the box point at `pointer`. Shift snaps to 15 degrees. */
export function rotationTo(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
  snap = false,
): number {
  let deg = (Math.atan2(pointer.y - center.y, pointer.x - center.x) * 180) / Math.PI + 90;
  if (snap) deg = Math.round(deg / 15) * 15;
  deg = Math.round(deg) % 360;
  return deg > 180 ? deg - 360 : deg <= -180 ? deg + 360 : deg;
}

const DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

/** An arrow key moves by 1px, with Shift by 10px. Returns null for other keys. */
export function nudgeDelta(key: string, shift: boolean): { dx: number; dy: number } | null {
  const d = DIRECTIONS[key];
  return d ? { dx: d[0] * (shift ? 10 : 1), dy: d[1] * (shift ? 10 : 1) } : null;
}

export const moveArrow = (a: Arrow, dx: number, dy: number): Arrow => ({
  x1: a.x1 + dx,
  y1: a.y1 + dy,
  x2: a.x2 + dx,
  y2: a.y2 + dy,
});
export const moveArrowEnd = (a: Arrow, end: 1 | 2, dx: number, dy: number): Arrow =>
  end === 1 ? { ...a, x1: a.x1 + dx, y1: a.y1 + dy } : { ...a, x2: a.x2 + dx, y2: a.y2 + dy };
