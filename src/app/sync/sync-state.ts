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
} from './shared-state';
import { SYNC_TRANSPORTS } from './transport';

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
  /** Slidev's "sync mode" menu: which way navigation may travel for viewers and presenters. */
  readonly directions = storedSignal<SyncDirections>('slidev-sync-directions', {
    viewerSend: true,
    viewerReceive: true,
    presenterSend: true,
    presenterReceive: true,
  });

  private helloHandlers: (() => void)[] = [];
  private drawingHandlers: ((patch: DrawingsState) => void)[] = [];

  constructor() {
    for (const t of this.transports) t.listen((channel, data) => this.receive(channel, data));
  }

  /** Change the shared state here and tell the others. A timer goes with this device's clock (see cleanShared). */
  patchShared(patch: Partial<SharedState>) {
    this.shared.update((s) => ({ ...s, ...patch }));
    this.send(
      'shared',
      patch.timer ? { ...patch, timer: { ...patch.timer, sentAt: Date.now() } } : patch,
    );
  }

  /** Change the drawing of one slide here and tell the others. */
  patchDrawing(no: number, svg: string) {
    this.drawings.update((d) => ({ ...d, [no]: svg }));
    this.send('drawings', { [no]: svg });
  }

  /** A window that just opened asks for the current position; presenters answer (see nav-sync), and every window that
   *  knows a running or paused timer answers with it (a presenter tab that was closed and opened again gets it back). */
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
    if (channel === 'shared') this.shared.update((s) => ({ ...s, ...cleanShared(data) }));
    else if (channel === 'hello') {
      const timer = this.shared().timer;
      if (timer.status !== 'stopped') this.patchShared({ timer });
      this.helloHandlers.forEach((fn) => fn());
    } else if (channel === 'drawings') {
      const patch = cleanDrawings(data);
      this.drawings.update((d) => ({ ...d, ...patch }));
      this.drawingHandlers.forEach((fn) => fn(patch));
    }
  }
}
