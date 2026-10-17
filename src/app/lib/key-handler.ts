import { DestroyRef, inject } from '@angular/core';
import { Drawings } from '../drawing/drawings';
import { DragState } from '../drag/drag-state';
import { makeActions } from './actions';
import { dropMouseFocus, pressesControl } from './key-focus';
import { Dark } from './dark';
import { Fullscreen } from './fullscreen';
import { Nav } from './nav';
import { findShortcut, resolveShortcuts } from './shortcuts';
import { Ui } from './ui-state';

// Is the user typing somewhere? Then letters are text, not shortcuts.
// Keys typed into a text field or a Monaco editor (its input is a plain div) are not shortcuts.
// A checkbox, radio or button takes no text, so the arrow keys still move the deck after one is clicked.
const NOT_TEXT = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'color',
  'file',
  'image',
]);
export const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    /^(TEXTAREA|SELECT)$/.test(t.tagName) ||
    (t instanceof HTMLInputElement && !NOT_TEXT.has(t.type)) ||
    t.closest('.monaco-editor') !== null);

/** The keydown handler of a page that has a Nav and a Ui: the deck and the presenter share it. Call in a constructor. */
export function keyHandler(nav: Nav, ui: Ui): (e: KeyboardEvent) => void {
  const actions = makeActions(
    nav,
    ui,
    inject(Dark),
    inject(Fullscreen),
    inject(Drawings),
    inject(DragState),
  );
  const shortcuts = resolveShortcuts(actions);
  document.addEventListener('click', dropMouseFocus);
  inject(DestroyRef).onDestroy(() => document.removeEventListener('click', dropMouseFocus));
  return (e) => {
    if (isTyping(e.target)) {
      // Escape leaves a form field (not Monaco, which closes its own widgets with it), so the keys work again.
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.monaco-editor'))
        (e.target as HTMLElement).blur();
      return;
    }
    if (pressesControl(e)) return;
    const shortcut = findShortcut(e, shortcuts);
    if (!shortcut) return;
    e.preventDefault();
    shortcut.run();
  };
}
