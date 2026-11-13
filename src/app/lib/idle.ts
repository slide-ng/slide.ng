import { DestroyRef, inject } from '@angular/core';

export function watchIdle(
  delay: number,
  changed: (idle: boolean) => void,
  target: EventTarget = window,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onMove = () => {
    changed(false);
    clearTimeout(timer);
    timer = setTimeout(() => changed(true), delay);
  };
  target.addEventListener('pointermove', onMove, { passive: true });
  inject(DestroyRef).onDestroy(() => {
    target.removeEventListener('pointermove', onMove);
    clearTimeout(timer);
  });
  return onMove;
}
