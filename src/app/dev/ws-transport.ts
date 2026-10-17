import { SyncTransport } from '../sync/transport';
import { API, DevApi } from './dev-api';

const MAX_WAITING = 20; // messages sent before the socket is open (the `hello` of a page that just opened)

/**
 * Sync through the dev companion server, so other devices (a phone on the same network) can follow the
 * presenter too. Messages travel as `{ channel, data }` text. It reconnects by itself when the connection drops.
 */
export class WebSocketTransport implements SyncTransport {
  private handler: (channel: string, data: unknown) => void = () => {};
  private socket: WebSocket | null = null;
  private waiting: string[] = [];
  private delay = 500;
  private opened = false;

  constructor(private api: DevApi) {
    void this.connect();
  }

  send(channel: string, data: unknown) {
    const text = JSON.stringify({ channel, data });
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(text);
    else if (this.waiting.length < MAX_WAITING) this.waiting.push(text);
  }

  listen(handler: (channel: string, data: unknown) => void) {
    this.handler = handler;
  }

  private async connect() {
    const token = await this.api.token();
    if (!token) return;
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${scheme}://${location.host}${API}/ws?token=${encodeURIComponent(token)}`,
    );
    this.socket = socket;
    socket.onopen = () => {
      this.delay = 500;
      // Back after a lost connection: the others moved on meanwhile, so ask where they are (presenters answer), as a
      // window that opens does (SyncState.sendHello).
      if (this.opened) socket.send(JSON.stringify({ channel: 'hello', data: {} }));
      this.opened = true;
      this.waiting.splice(0).forEach((text) => socket.send(text));
    };
    socket.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data));
        if (m && typeof m.channel === 'string') this.handler(m.channel, m.data);
      } catch {
        /* not ours */
      }
    };
    // Try again with growing pauses (the dev server restarts now and then).
    socket.onclose = () => {
      this.socket = null;
      setTimeout(() => void this.connect(), this.delay);
      this.delay = Math.min(this.delay * 2, 10_000);
    };
  }
}
