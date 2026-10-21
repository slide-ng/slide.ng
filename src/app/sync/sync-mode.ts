// Slidev's sync mode (SyncControls.vue): the four ways a window can take part in navigation sync, read from and
// written to the per-role directions in SyncState.
import { SyncDirections } from './sync-state';

export type SyncMode = 'bidirectional' | 'receive-only' | 'send-only' | 'off';

export const SYNC_MODES: { value: SyncMode; label: string }[] = [
  { value: 'bidirectional', label: 'Bidirectional Sync' },
  { value: 'receive-only', label: 'Receive Only' },
  { value: 'send-only', label: 'Send Only' },
  { value: 'off', label: 'Disable' },
];

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
