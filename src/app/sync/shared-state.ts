// What the windows share about the live presentation (Slidev's SharedState).

export type TimerStatus = 'stopped' | 'running' | 'paused';

export interface TimerState {
  status: TimerStatus;
  startedAt: number; // ms since 1970 by this device's clock; while paused, moved so that `now - startedAt` is the time passed
  pausedAt: number;
  /** When the timer was last started, paused or reset, by this device's clock (moved like `startedAt`). The newest change
   *  wins (mergeShared), as the newest move does: a tab that comes back with an older timer does not undo a later reset.
   *  Missing on a timer that was never changed. */
  changedAt?: number;
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
   *  viewer's move (so the other viewers follow too): the id of that viewer, which ignores its own move coming back.
   *  `time`: when the move was made, by this window's clock (see cleanShared); 0 = a presenter's first position after
   *  it opened, which is not a move (see nav-sync). */
  lastUpdate: { id: string; type: 'presenter' | 'viewer'; time: number; via?: string } | null;
  browser?: string | null;
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
 * A timer and a move come with the sender's clock (`sentAt`, see SyncState.patchShared): their times are moved onto ours
 * (`now`), so devices whose clocks differ show the same time passed, and a move from a device whose clock is behind is
 * still newer than the one before it. Without `sentAt` the times are taken as they are.
 */
export function cleanShared(data: unknown, now = Date.now()): Partial<SharedState> {
  const out: Partial<SharedState> = {};
  if (!obj(data)) return out;
  // 0 stays 0: a timer not started or not paused, a presenter's first position (older than any move, see nav-sync).
  const onOurClock = (at: number, sentAt: unknown) => (at && num(sentAt) ? at + now - sentAt : at);
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
      startedAt: onOurClock(t['startedAt'], t['sentAt']),
      pausedAt: onOurClock(t['pausedAt'], t['sentAt']),
    };
    if (num(t['changedAt']) && t['changedAt'] > 0)
      out.timer.changedAt = onOurClock(t['changedAt'], t['sentAt']);
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
  const b = data['browser'];
  if (b === null) out.browser = null;
  else if (typeof b === 'string' && b.length <= 2048 && /^https?:\/\//i.test(b)) out.browser = b;
  const u = data['lastUpdate'];
  if (
    obj(u) &&
    typeof u['id'] === 'string' &&
    (u['type'] === 'presenter' || u['type'] === 'viewer') &&
    num(u['time'])
  ) {
    out.lastUpdate = {
      id: u['id'].slice(0, 64),
      type: u['type'],
      time: onOurClock(u['time'], u['sentAt']),
    };
    if (typeof u['via'] === 'string') out.lastUpdate.via = u['via'].slice(0, 64);
  }
  return out;
}

/**
 * `patch` (from outside, cleaned) applied to `state`. A move older than the one the state holds keeps only its other parts
 * (timer, cursor): its position and `lastUpdate` are dropped. A timer changed before the one the state holds is dropped
 * the same way (`changedAt`): a tab that comes back with a timer it kept must not undo another window's later reset. Messages can come faster than the windows look at the state
 * (the effects run once for several), so the newest move must win here, not in the order the messages came: two presenter
 * windows answer a new window's hello, and the older answer may come last.
 */
export function mergeShared(state: SharedState, patch: Partial<SharedState>): SharedState {
  if (patch.timer && (patch.timer.changedAt ?? 0) < (state.timer.changedAt ?? 0)) {
    const { timer: _t, ...rest } = patch;
    patch = rest;
  }
  if (patch.lastUpdate && state.lastUpdate && patch.lastUpdate.time < state.lastUpdate.time) {
    const { page: _p, clicks: _c, clicksTotal: _t, lastUpdate: _u, ...rest } = patch;
    return { ...state, ...rest };
  }
  return { ...state, ...patch };
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
