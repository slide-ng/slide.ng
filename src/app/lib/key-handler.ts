import { DestroyRef, inject } from '@angular/core';
import { Drawings } from '../drawing/drawings';
import { DragState } from '../drag/drag-state';
import { makeActions } from './actions';
import { dropMouseFocus, pressesControl } from './key-focus';
import { Dark } from './dark';
import { Fullscreen } from './fullscreen';
import { Nav } from './nav';
import { PresenterPrefs } from '../presenter/prefs';
import { findShortcut, resolveShortcuts } from './shortcuts';
import { Ui } from './ui-state';
import { typedJustNow } from '../dev/side-editor-state';

// Is the user typing somewhere? Then letters are text, not shortcuts.
// Keys typed into a text field or a Monaco editor (its input is a plain div) are not shortcuts.
// A checkbox or button takes no text, so the arrow keys still move the deck after one is clicked (a radio group uses the arrows
// itself, so it counts as typing). Space and Enter still belong to the focused control (see key-focus.ts).
const NOT_TEXT = new Set(['checkbox', 'button', 'submit', 'reset', 'color', 'file', 'image']);
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
    inject(PresenterPrefs),
  );
  const shortcuts = resolveShortcuts(actions);
  document.addEventListener('click', dropMouseFocus);
  inject(DestroyRef).onDestroy(() => document.removeEventListener('click', dropMouseFocus));
  return (e) => {
    if (e.isComposing) return; // a key that commits or cancels an input method's text (Japanese, Chinese, ...)
    // A modal <dialog> on a slide owns the keys: Escape closes it, and the slides do not move behind it.
    if (document.querySelector('dialog:modal')) return;
    // The same for the info dialog and the context menu: only Escape (which closes them) reaches the shortcuts.
    if ((ui.info() || ui.contextMenu()) && e.key !== 'Escape') return;
    if (ui.barDrag()) return;
    // Typing in the side editor can reload the page; keys that land on the page right then were meant for the editor.
    // Only in the first seconds after the page loaded, so a key pressed later on the slide still works.
    if (e.target === document.body && performance.now() < 5_000 && typedJustNow()) return;
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
