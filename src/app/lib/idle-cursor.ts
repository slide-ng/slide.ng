import { DestroyRef, effect, inject } from '@angular/core';
import { watchIdle } from './idle';

const DELAY = 2000;

// Hides the mouse cursor after 2 seconds without movement, while `enabled()` is true.
// Call it once, in an injection context (a constructor). The listener goes away with its owner.
export function hideIdleCursor(enabled: () => boolean) {
  const show = () => {
    document.body.style.cursor = '';
  };
  watchIdle(
    DELAY,
    (idle) => {
      document.body.style.cursor = idle && enabled() ? 'none' : '';
    },
    document.body,
  );
  inject(DestroyRef).onDestroy(show);
  // Turned off in the settings: bring the cursor back at once.
  effect(() => {
    if (!enabled()) show();
  });
}
