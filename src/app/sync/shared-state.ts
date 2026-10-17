// What the windows share about the live presentation (Slidev's SharedState).

export type TimerStatus = 'stopped' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  startedAt: number; // ms since 1970; while paused, moved so that `now - startedAt` is the time passed
  pausedAt: number;
}

export interface Cursor {
  x: number; // percent of the slide width
  y: number; // percent of the slide height
  style: 'cursor' | 'laser';
}

export interface SharedState {
  page: number;
  clicks: number;
  clicksTotal: number;
  timer: TimerState;
  /** `null` = the presenter's cursor is not over the slide. (null, not undefined: JSON keeps null.) */
  cursor: Cursor | null;
  /** Who moved last. A window ignores updates that came from its own kind. `via` is set when a presenter passes on a
   *  viewer's move (so the other viewers follow too): the id of that viewer, which ignores its own move coming back. */
  lastUpdate: { id: string; type: 'presenter' | 'viewer'; time: number; via?: string } | null;
}

export const initialShared = (): SharedState => ({
  page: 0,
  clicks: 0,
  clicksTotal: 0,
  timer: { status: 'stopped', startedAt: 0, pausedAt: 0 },
  cursor: null,
  lastUpdate: null,
});

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const count = (v: unknown): v is number => num(v) && Number.isInteger(v) && v >= 0 && v < 1e6; // slide and click numbers
const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Messages come from other windows or devices, so only keys we know and values of the right
 * type get through. Anything else is dropped; a bad message can never put junk in the state.
 */
export function cleanShared(data: unknown): Partial<SharedState> {
  const out: Partial<SharedState> = {};
  if (!obj(data)) return out;
  if (count(data['page'])) out.page = data['page'];
  if (count(data['clicks'])) out.clicks = data['clicks'];
  if (count(data['clicksTotal'])) out.clicksTotal = data['clicksTotal'];
  const t = data['timer'];
  if (
    obj(t) &&
    ['stopped', 'running', 'paused'].includes(t['status'] as string) &&
    num(t['startedAt']) &&
    num(t['pausedAt'])
  ) {
    out.timer = {
      status: t['status'] as TimerStatus,
      startedAt: t['startedAt'],
      pausedAt: t['pausedAt'],
    };
  }
  const c = data['cursor'];
  if (c === null) out.cursor = null;
  else if (
    obj(c) &&
    num(c['x']) &&
    num(c['y']) &&
    (c['style'] === 'cursor' || c['style'] === 'laser')
  ) {
    out.cursor = { x: c['x'], y: c['y'], style: c['style'] };
  }
  const u = data['lastUpdate'];
  if (
    obj(u) &&
    typeof u['id'] === 'string' &&
    (u['type'] === 'presenter' || u['type'] === 'viewer') &&
    num(u['time'])
  ) {
    out.lastUpdate = { id: u['id'].slice(0, 64), type: u['type'], time: u['time'] };
    if (typeof u['via'] === 'string') out.lastUpdate.via = u['via'].slice(0, 64);
  }
  return out;
}

/** Drawings: slide number -> the SVG markup drauu dumped ('' = nothing drawn). */
export type DrawingsState = Record<number, string>;

const MAX_SVG = 500_000; // characters; a drawing bigger than this is dropped

export function cleanDrawings(data: unknown): DrawingsState {
  const out: DrawingsState = {};
  if (!obj(data)) return out;
  for (const [key, value] of Object.entries(data)) {
    const no = Number(key);
    if (Number.isInteger(no) && no > 0 && typeof value === 'string' && value.length <= MAX_SVG)
      out[no] = value;
  }
  return out;
}
