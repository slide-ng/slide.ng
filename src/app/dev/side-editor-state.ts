import { Injectable, inject, signal } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';
import { editorEnabled } from '../lib/switches';
import { DevApi } from './dev-api';

/** Is the side editor open, and is there a dev server to save to at all? */
@Injectable({ providedIn: 'root' })
export class SideEditorState {
  /** Remembered in the browser, because a rebuild after an edit can reload the page. */
  readonly open = storedSignal('slide-ng-editor-open', false);
  /** True once the companion server accepted us. A static build never gets there. */
  readonly available = signal(false);
  /** The page keeps this much room free on the right while the editor is open. */
  readonly width = 420;

  constructor() {
    const api = inject(DevApi);
    if (api.enabled && editorEnabled())
      void api.token().then((token) => this.available.set(!!token));
  }

  toggle() {
    this.open.update((v) => !v);
  }
}

// Typing in the editor can change a slide's title or note, which reloads the page. Where the caret was is kept for a moment,
// so the editor can take it back, and the deck does not read the keys typed during the reload as shortcuts.
const CARET = 'slide-ng-editor-caret';
const FRESH_MS = 15_000;
export interface EditorCaret {
  no: number;
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
export function takeCaret(no: number): EditorCaret | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CARET) ?? 'null') as EditorCaret | null;
    if (!c || c.no !== no || Date.now() - c.at > FRESH_MS) return null;
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
