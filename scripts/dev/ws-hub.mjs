// The WebSocket sync transport: every message one window sends goes to all the other windows.
// It only passes on `{ channel, data }` for the channels the app uses, and drops the rest. It remembers the last slide a
// window reported (for the MCP `get_info` tool; `goto_slide` waits for the next one), and it can send a message to every
// window (`goto_slide`). It also keeps the last running or paused timer: a presenter page opened again after every other
// window was closed asks for it with its hello, and gets it back.
import { WebSocketServer } from 'ws';

// `position` is only for the hub: a window that may not drive (a viewer on another machine) says where it is after a move.
const CHANNELS = new Set(['shared', 'drawings', 'hello', 'position']);
export const MAX_MESSAGE = 600_000; // a drawing of 500 000 characters fits, a bigger message closes the connection

/** The message in this text, if it is one the app could have sent; otherwise null. */
function parseMessage(text) {
  try {
    const m = JSON.parse(text);
    return !!m && typeof m === 'object' && CHANNELS.has(m.channel) && 'data' in m ? m : null;
  } catch {
    return null;
  }
}

/** The slide and click in a `shared` or `position` message, or null. */
export function positionOf(text) {
  try {
    const { channel, data } = JSON.parse(text);
    const count = (v) => Number.isInteger(v) && v >= 0 && v < 1e6;
    if (!['shared', 'position'].includes(channel) || !count(data?.page) || data.page < 1)
      return null;
    return { page: data.page, clicks: count(data.clicks) ? data.clicks : 0 };
  } catch {
    return null;
  }
}

/** Sends one message to every open window. Returns how many got it. */
export function sendToAll(hub, message) {
  const text = JSON.stringify(message);
  let sent = 0;
  for (const socket of hub.clients)
    if (socket.readyState === socket.OPEN) (socket.send(text), sent++);
  return sent;
}

/** The next position a window reports on slide `page` within `ms`, or null. */
export function nextPosition(hub, page, ms) {
  return new Promise((done) => {
    const seen = (position) => position.page === page && finish(position);
    const timer = setTimeout(() => finish(null), ms);
    const finish = (position) => {
      clearTimeout(timer);
      hub.off('position', seen);
      done(position);
    };
    hub.on('position', seen);
  });
}

/** Is this text one message the app could have sent? */
export function isMessage(text) {
  return parseMessage(text) !== null;
}

/**
 * The timer to send to a window that says hello, at hub time `now`, or null. `kept` is `{ timer, at }`: the timer as a
 * window sent it, with the sender's clock in `sentAt`, and the hub's time when it came. The sender's clock is moved on by
 * the time it was kept, so the window that gets it sees the time that has passed since (shared-state.ts cleanShared).
 */
export function keptTimer(kept, now) {
  const t = kept?.timer;
  if (!t || typeof t !== 'object' || (t.status !== 'running' && t.status !== 'paused')) return null;
  return typeof t.sentAt === 'number' ? { ...t, sentAt: t.sentAt + (now - kept.at) } : t;
}

export function createHub() {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });
  /** The last position a window sent, or null before the first one. */
  wss.position = null;
  let kept = null;
  wss.on('connection', (socket) => {
    // A message over the limit makes `ws` close the connection and raise an error: that must not stop the server.
    socket.on('error', () => {});
    socket.on('message', (raw, isBinary) => {
      const text = raw.toString();
      const m = isBinary ? null : parseMessage(text);
      if (!m) return;
      const position = positionOf(text);
      if (position) ((wss.position = position), wss.emit('position', position));
      if (m.channel === 'position') return; // for the hub only
      if (m.channel === 'shared' && m.data?.timer) kept = { timer: m.data.timer, at: Date.now() };
      const timer = m.channel === 'hello' ? keptTimer(kept, Date.now()) : null;
      if (timer) socket.send(JSON.stringify({ channel: 'shared', data: { timer } }));
      for (const other of wss.clients)
        if (other !== socket && other.readyState === other.OPEN) other.send(text);
    });
  });
  return wss;
}
