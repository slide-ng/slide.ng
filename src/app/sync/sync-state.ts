// The shared state of the live presentation, as signals, and the way it reaches other windows.
// Callers read the signals and call `patchShared` / `patchDrawings`; where the messages
// travel is decided by the SYNC_TRANSPORTS that are provided (see transport.ts).
import { Injectable, inject, signal } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';
import {
  DrawingsState,
  SharedState,
  cleanDrawings,
  cleanShared,
  initialShared,
  mergeShared,
} from './shared-state';
import { SYNC_TRANSPORTS } from './transport';
import { scopedKey } from '../lib/deck-scope';

const DIRECTIONS_KEY = 'slidev-sync-directions';

/** A move that came from outside, with the position it went to. */
export interface Move {
  page: number;
  clicks: number;
  lastUpdate: NonNullable<SharedState['lastUpdate']>;
}

export interface SyncDirections {
  viewerSend: boolean;
  viewerReceive: boolean;
  presenterSend: boolean;
  presenterReceive: boolean;
}

@Injectable({ providedIn: 'root' })
export class SyncState {
  private transports = inject(SYNC_TRANSPORTS, { optional: true }) ?? [];
  /** Tells apart the updates of this window from the others'. */
  readonly id = Math.random().toString(36).slice(2) + Date.now().toString(36);

  readonly shared = signal<SharedState>(initialShared());
  readonly drawings = signal<DrawingsState>({});
  /**
   * The newest move from outside of each kind of window. `shared` holds only the last move of all, and messages can come
   * faster than the windows look at it: MCP's goto_slide sends a viewer move and a presenter move with the same time, and
   * when both came before the effects ran, `shared` showed only the second. A window follows the moves of the other kind
   * from here (nav-sync), so it still sees the one meant for it.
   */
  readonly moves = signal<Record<'presenter' | 'viewer', Move | null>>({
    presenter: null,
    viewer: null,
  });
  /** Slidev's "sync mode" menu: which way navigation may travel for viewers and presenters. */
  readonly directions = storedSignal<SyncDirections>(DIRECTIONS_KEY, {
    viewerSend: true,
    viewerReceive: true,
    presenterSend: true,
    presenterReceive: true,
  });

  /** The time of the last move this window sent (0 before one): an older move from outside is not followed. */
  ownMoveTime = 0;

  private helloHandlers: (() => void)[] = [];
  private drawingHandlers: ((patch: DrawingsState) => void)[] = [];

  constructor() {
    for (const t of this.transports) t.listen((channel, data) => this.receive(channel, data));
    // The sync mode chosen in another window of this browser (the presenter's or a viewer's menu) applies here too,
    // and this window must not write its old copy back over it (Slidev's useLocalStorage listens the same way).
    window.addEventListener('storage', (e) => {
      if (e.key !== scopedKey(DIRECTIONS_KEY) || !e.newValue) return;
      try {
        this.directions.update((d) => ({ ...d, ...JSON.parse(e.newValue!) }));
      } catch {
        // not JSON: keep ours
      }
    });
  }

  /** Change the shared state here and tell the others. A timer and a move go with this device's clock (`sentAt`, see
   *  cleanShared). */
  patchShared(patch: Partial<SharedState>) {
    this.shared.update((s) => ({ ...s, ...patch }));
    const sentAt = Date.now();
    const out: Record<string, unknown> = { ...patch };
    if (patch.timer) out['timer'] = { ...patch.timer, sentAt };
    if (patch.lastUpdate) {
      out['lastUpdate'] = { ...patch.lastUpdate, sentAt };
      if (patch.lastUpdate.id === this.id)
        this.ownMoveTime = Math.max(this.ownMoveTime, patch.lastUpdate.time);
    }
    this.send('shared', out);
  }

  /** Change the drawing of one slide here and tell the others. */
  patchDrawing(no: number, svg: string) {
    this.drawings.update((d) => ({ ...d, [no]: svg }));
    this.send('drawings', { [no]: svg });
  }

  /** Where this window is, for the dev server only (MCP's goto_slide): no window follows it. */
  reportPosition(position: { page: number; clicks: number }) {
    this.send('position', position);
  }

  /** A window that just opened asks for the current position; presenters answer (see nav-sync), and every window that
   *  knows a running, paused or reset timer answers with it (a presenter tab that was closed and opened again gets it back). */
  sendHello() {
    this.send('hello', {});
  }
  /** Returns a function that removes the handler again. */
  onHello(fn: () => void): () => void {
    this.helloHandlers.push(fn);
    return () => (this.helloHandlers = this.helloHandlers.filter((h) => h !== fn));
  }
  /** Called when drawings arrive from outside (not for our own patches). */
  onRemoteDrawings(fn: (patch: DrawingsState) => void): () => void {
    this.drawingHandlers.push(fn);
    return () => (this.drawingHandlers = this.drawingHandlers.filter((h) => h !== fn));
  }

  private send(channel: string, data: unknown) {
    for (const t of this.transports) t.send(channel, data);
  }

  private receive(channel: string, data: unknown) {
    if (channel === 'shared') {
      const patch = cleanShared(data);
      const next = mergeShared(this.shared(), patch);
      this.shared.set(next);
      const u = patch.lastUpdate;
      // Not older than the move the state held (mergeShared kept it): it counts as a move of its kind.
      if (u && next.lastUpdate === u)
        this.moves.update((m) => ({
          ...m,
          [u.type]: { page: next.page, clicks: next.clicks, lastUpdate: u },
        }));
    } else if (channel === 'hello') {
      // A reset is answered too (it has a time): a tab that comes back with an older running timer then takes the reset.
      const timer = this.shared().timer;
      if (timer.status !== 'stopped' || timer.changedAt) this.patchShared({ timer });
      this.helloHandlers.forEach((fn) => fn());
    } else if (channel === 'drawings') {
      const patch = cleanDrawings(data);
      this.drawings.update((d) => ({ ...d, ...patch }));
      this.drawingHandlers.forEach((fn) => fn(patch));
    }
  }
}
