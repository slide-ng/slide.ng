import type { UiTextKey } from '../i18n/en';
// Slidev's sync mode (SyncControls.vue): the four ways a window can take part in navigation sync, read from and
// written to the per-role directions in SyncState.
import { SyncDirections } from './sync-state';

export type SyncMode = 'bidirectional' | 'receive-only' | 'send-only' | 'off';

export const SYNC_MODES: { value: SyncMode; label: UiTextKey }[] = [
  { value: 'bidirectional', label: 'sync.bidirectional' },
  { value: 'receive-only', label: 'sync.receiveOnly' },
  { value: 'send-only', label: 'sync.sendOnly' },
  { value: 'off', label: 'sync.off' },
];

/**
 * How far an arrow key moves in the sync menu (a radio group): down and up go to the next and the previous mode;
 * right and left too, mirrored on a right-to-left page so that they follow what is seen. Other keys: 0.
 */
export function modeStep(key: string, rtl: boolean): number {
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight',
    back = rtl ? 'ArrowRight' : 'ArrowLeft';
  return key === 'ArrowDown' || key === forward ? 1 : key === 'ArrowUp' || key === back ? -1 : 0;
}

/** Whether this window sends and receives, for its role. */
export function syncFlags(d: SyncDirections, isPresenter: boolean) {
  return isPresenter
    ? { send: d.presenterSend, receive: d.presenterReceive }
    : { send: d.viewerSend, receive: d.viewerReceive };
}

/** The mode of this window's role. */
export function syncMode(d: SyncDirections, isPresenter: boolean): SyncMode {
  const { send, receive } = syncFlags(d, isPresenter);
  if (send && receive) return 'bidirectional';
  if (receive) return 'receive-only';
  if (send) return 'send-only';
  return 'off';
}

/** A mode that sends: a window that may not send (a viewer on another machine, see nav-sync.ts) cannot take it. */
export const sends = (mode: SyncMode) => mode === 'bidirectional' || mode === 'send-only';

/** What `mode` really does in a window that may not send: it only receives, or does nothing. */
export function effectiveMode(mode: SyncMode, maySend: boolean): SyncMode {
  if (maySend) return mode;
  return mode === 'bidirectional' ? 'receive-only' : mode === 'send-only' ? 'off' : mode;
}

/** The directions with this role's pair set to `mode`; the other role keeps its own. */
export function withSyncMode(
  d: SyncDirections,
  isPresenter: boolean,
  mode: SyncMode,
): SyncDirections {
  const send = mode === 'bidirectional' || mode === 'send-only';
  const receive = mode === 'bidirectional' || mode === 'receive-only';
  return isPresenter
    ? { ...d, presenterSend: send, presenterReceive: receive }
    : { ...d, viewerSend: send, viewerReceive: receive };
}
