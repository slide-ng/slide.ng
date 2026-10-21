// Drawings survive a reload: they are kept in localStorage, and the ones the generator found in
// `.slide-ng/drawings/` (when the deck has `drawings: { persist: true }`) are the starting point.
import { effect, inject } from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { createDrawingSaver } from '../dev/dev-persist';
import { DRAWINGS } from '../../slides/generated';
import { SyncState } from '../sync/sync-state';
import { DrawingsState, cleanDrawings } from '../sync/shared-state';
import { scopedKey } from '../lib/deck-scope';

const RETRY_MS = 5000;

/** The localStorage key, of this deck only (deck-scope.ts). */
export const drawingsKey = () => scopedKey('slide-ng-drawings');

/** Drawings saved in this browser. Storage may be blocked, then there are none. */
export function readStored(): DrawingsState {
  try {
    return cleanDrawings(JSON.parse(localStorage.getItem(drawingsKey()) ?? '{}'));
  } catch {
    return {};
  }
}

/** What to start with: the drawings baked in by the generator, then whatever this browser saved on top. */
export const initialDrawings = (): DrawingsState => ({
  ...cleanDrawings(DRAWINGS),
  ...readStored(),
});

/** Fill the shared drawings once, and write every change to localStorage (a little later, drawing makes many changes). */
export function startPersistence(persist: boolean) {
  const sync = inject(SyncState);
  sync.drawings.update((d) => ({ ...initialDrawings(), ...d }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  effect(() => {
    const state = sync.drawings();
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(drawingsKey(), JSON.stringify(state));
      } catch {
        /* the drawing just is not remembered */
      }
    }, 300);
  });

  // With `drawings.persist` and the dev server, every drawing is also written to .slide-ng/drawings/<slide>.svg.
  const api = inject(DevApi);
  if (!persist || !api.enabled) return;
  const saver = createDrawingSaver(api, cleanDrawings(DRAWINGS), () => sync.drawings());
  let diskTimer: ReturnType<typeof setTimeout> | undefined;
  const later = (ms: number, retries: number) => {
    clearTimeout(diskTimer);
    diskTimer = setTimeout(async () => {
      await saver.save();
      if (saver.dirty && retries > 0) later(RETRY_MS, retries - 1); // a write failed: try again
    }, ms);
  };
  effect(() => {
    sync.drawings();
    later(800, 3);
  });
}
