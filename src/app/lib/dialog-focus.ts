import { DestroyRef, effect, inject, untracked } from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Moves the focus into a dialog when it opens, keeps Tab and Shift+Tab inside it while it is open (it is `aria-modal`), and
 * gives the focus back to what had it before when it closes. Call in a constructor. `target` is the dialog element (give it
 * tabindex="-1"); `also` are elements outside it that belong to it (the overview's close button).
 */
export function focusWhileOpen(
  open: () => boolean,
  target: () => HTMLElement | undefined,
  also: () => (HTMLElement | undefined)[] = () => [],
) {
  let before: HTMLElement | null = null;
  effect(() => {
    if (open()) {
      untracked(() => (before = document.activeElement as HTMLElement | null));
      setTimeout(() => target()?.focus()); // after the dialog is drawn
    } else if (before) {
      const back = before;
      before = null;
      if (back !== document.body && back.isConnected) back.focus();
    }
  });

  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !open()) return;
    const areas = [target(), ...also()].filter((el): el is HTMLElement => !!el);
    if (!areas.length) return;
    const stops = areas.flatMap((a) => [
      ...(a.matches(FOCUSABLE) ? [a] : []),
      ...a.querySelectorAll<HTMLElement>(FOCUSABLE),
    ]);
    if (!stops.length) {
      e.preventDefault(); // nothing to Tab to: the focus stays on the dialog
      areas[0].focus();
      return;
    }
    const at = stops.indexOf(document.activeElement as HTMLElement);
    // Wrap at the ends, and pull the focus back when it is outside the dialog (or on the dialog itself).
    if (at === -1 || (e.shiftKey ? at === 0 : at === stops.length - 1)) {
      e.preventDefault();
      stops[e.shiftKey ? stops.length - 1 : 0].focus();
    }
  };
  document.addEventListener('keydown', trap, true);
  inject(DestroyRef).onDestroy(() => document.removeEventListener('keydown', trap, true));
}
