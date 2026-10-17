// Space and Enter belong to a focused button or link: they press it, they do not move through the slides.

const PRESSABLE =
  'button, a[href], summary, input[type="checkbox"], input[type="button"], input[type="submit"], [role="button"], [role="menuitem"]';

/** Is the key one that presses the focused control (Space or Enter on a button, link, checkbox, `<summary>` or menu item)? */
export function pressesControl(e: Pick<KeyboardEvent, 'key' | 'target'>): boolean {
  return (
    (e.key === ' ' || e.key === 'Enter') &&
    e.target instanceof HTMLElement &&
    e.target.closest(PRESSABLE) !== null
  );
}

/**
 * A button clicked with the mouse gives its focus back, so Space still moves through the slides afterwards.
 * A keyboard "click" (detail 0) keeps the focus.
 */
export function dropMouseFocus(e: Pick<MouseEvent, 'detail' | 'target'>) {
  if (e.detail > 0 && e.target instanceof HTMLElement) e.target.closest('button')?.blur();
}
