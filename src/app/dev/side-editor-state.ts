import { Injectable, inject, signal } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';
import { editorEnabled } from '../lib/switches';
import { DevApi } from './dev-api';

/** Is the side editor open, and is there a dev server to save to at all? */
@Injectable({ providedIn: 'root' })
export class SideEditorState {
  /** Remembered in the browser, because a rebuild after an edit can reload the page. */
  readonly open = storedSignal('slide-ng-editor-open', false);
  /** The presenter page's own flag (the editor in place of the notes), so opening it there never opens
   *  the editor over the slides on the audience page after the reload. */
  readonly presenterOpen = storedSignal('slide-ng-presenter-editor-open', false);
  /** True once the companion server accepted us and the deck allows the editor. A static build never gets there. */
  readonly available = signal(false);
  /** The companion server accepted us, so slides can be written (the presenter's notes editor), whatever `editor` says. */
  readonly canWrite = signal(false);
  /** The page keeps this much room free on the right while the editor is open. */
  readonly width = 420;

  constructor() {
    const api = inject(DevApi);
    if (api.enabled)
      void api.token().then((token) => {
        this.canWrite.set(!!token);
        this.available.set(!!token && editorEnabled());
      });
  }

  /** Open on the deck page, or (`docked`) in the presenter's notes pane. */
  isOpen(docked = false) {
    return (docked ? this.presenterOpen : this.open)();
  }

  toggle(docked = false) {
    (docked ? this.presenterOpen : this.open).update((v) => !v);
  }
}

// Typing in the editor can change a slide's title or note, which reloads the page. Where the caret was is kept for a moment,
// so the editor can take it back, and the deck does not read the keys typed during the reload as shortcuts.
const CARET = 'slide-ng-editor-caret';
const FRESH_MS = 15_000;
export interface EditorCaret {
  no: number;
  /** The whole slide (side editor) or only its note (presenter's notes editor). */
  field?: 'source' | 'note';
  start: number;
  end: number;
  scroll: number;
  at: number;
}
export function saveCaret(caret: Omit<EditorCaret, 'at'>) {
  try {
    sessionStorage.setItem(CARET, JSON.stringify({ ...caret, at: Date.now() }));
  } catch {
    // no storage: the caret is simply not restored
  }
}
export function takeCaret(no: number, field: 'source' | 'note' = 'source'): EditorCaret | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CARET) ?? 'null') as EditorCaret | null;
    if (!c || c.no !== no || (c.field ?? 'source') !== field || Date.now() - c.at > FRESH_MS)
      return null;
    return c;
  } catch {
    return null;
  }
}
/** True right after typing in the editor (also across a reload): keys that land on the page then are not shortcuts. */
export function typedJustNow(ms = 3_000): boolean {
  try {
    const c = JSON.parse(sessionStorage.getItem(CARET) ?? 'null') as EditorCaret | null;
    return !!c && Date.now() - c.at < ms;
  } catch {
    return false;
  }
}
