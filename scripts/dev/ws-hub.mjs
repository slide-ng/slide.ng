// The WebSocket sync transport: every message one window sends goes to all the other windows.
// It only passes on `{ channel, data }` for the channels the app uses, and drops the rest. The one thing it remembers is the
// last slide a window reported (for the MCP `get_info` tool; `goto_slide` waits for the next one), and it can send a message to every window (`goto_slide`).
import { WebSocketServer } from 'ws';

const CHANNELS = new Set(['shared', 'drawings', 'hello']);
export const MAX_MESSAGE = 600_000; // a drawing of 500 000 characters fits, a bigger message closes the connection

/** Is this text one message the app could have sent? */
export function isMessage(text) {
  try {
    const m = JSON.parse(text);
    return !!m && typeof m === 'object' && CHANNELS.has(m.channel) && 'data' in m;
  } catch {
    return false;
  }
}

/** The slide and click in a `shared` message, or null. */
export function positionOf(text) {
  try {
    const { channel, data } = JSON.parse(text);
    const count = (v) => Number.isInteger(v) && v >= 0 && v < 1e6;
    if (channel !== 'shared' || !count(data?.page) || data.page < 1) return null;
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

export function createHub() {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE });
  /** The last position a window sent, or null before the first one. */
  wss.position = null;
  wss.on('connection', (socket) => {
    // A message over the limit makes `ws` close the connection and raise an error: that must not stop the server.
    socket.on('error', () => {});
    socket.on('message', (raw, isBinary) => {
      const text = raw.toString();
      if (isBinary || !isMessage(text)) return;
      const position = positionOf(text);
      if (position) ((wss.position = position), wss.emit('position', position));
      for (const other of wss.clients)
        if (other !== socket && other.readyState === other.OPEN) other.send(text);
    });
  });
  return wss;
}
