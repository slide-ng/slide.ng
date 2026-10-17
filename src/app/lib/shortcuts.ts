// Keyboard shortcuts as a plain list of { name, key, run, when }.
// The defaults are the same keys as Slidev's setup/shortcuts.ts. A deck can change them by
// providing SHORTCUTS_SETUP (see docs/SYNTAX.md): it gets the default list and returns the list to use.
import { InjectionToken, inject } from '@angular/core';

export interface Shortcut {
  name: string;
  /** A key name as in KeyboardEvent.key, optionally with `shift+` in front. A space is written `space`. */
  key: string;
  run: () => void;
  /** The shortcut only works while this returns true. */
  when?: () => boolean;
}

/** What shortcuts can act on. Filled by the deck. */
export interface ShortcutActions {
  next(): void;
  prev(): void;
  nextSlide(): void;
  prevSlide(): void;
  toggleDark(): void;
  toggleOverview(): void;
  toggleGoto(): void;
  toggleFullscreen(): void;
  closeAll(): void;
  overviewOpen(): boolean;
  /** Overview: move the highlight (left/right by 1, up/down by a row) or open the highlighted slide. */
  overviewMove(by: 'left' | 'right' | 'up' | 'down'): void;
  overviewGo(): void;
  /** The drawing toolbar is on: it owns d, o, g, Escape, ... (Slidev disables the shortcuts then). */
  drawingEnabled(): boolean;
  toggleDrawing(): void;
  /** A slide-ng-drag element is selected: the arrow keys nudge it instead of moving through the slides. */
  dragActive(): boolean;
}

/** Deck authors provide this to change the list: `{ provide: SHORTCUTS_SETUP, useValue: (a, list) => [...list, mine] }`. */
export const SHORTCUTS_SETUP = new InjectionToken<
  (actions: ShortcutActions, list: Shortcut[]) => Shortcut[]
>('SHORTCUTS_SETUP', {
  factory: () => (_actions, list) => list,
});

/** The `setup/shortcuts.ts` files of the roots, weakest first. They run after SHORTCUTS_SETUP, so both kinds add up. */
export const SHORTCUTS_FILES = new InjectionToken<
  ((actions: ShortcutActions, list: Shortcut[]) => Shortcut[])[]
>('SHORTCUTS_FILES', { factory: () => [] });

/** The list in use: the defaults, then a theme's SHORTCUTS_SETUP provider, then every setup/shortcuts.ts. Call it in an injection context. */
export function resolveShortcuts(actions: ShortcutActions): Shortcut[] {
  const base = inject(SHORTCUTS_SETUP)(actions, defaultShortcuts(actions));
  return inject(SHORTCUTS_FILES).reduce((all, f) => f(actions, all), base);
}

export function defaultShortcuts(a: ShortcutActions): Shortcut[] {
  const play = () => !a.overviewOpen() && !a.dragActive(); // arrow keys move through the overview while it is open, and nudge a selected slide-ng-drag
  const overview = () => a.overviewOpen();
  const notDrawing = () => !a.drawingEnabled();
  return [
    { name: 'next_space', key: 'space', run: a.next },
    { name: 'prev_space', key: 'shift+space', run: a.prev },
    { name: 'next_right', key: 'ArrowRight', run: a.next, when: play },
    { name: 'prev_left', key: 'ArrowLeft', run: a.prev, when: play },
    { name: 'next_page_key', key: 'PageDown', run: a.next },
    { name: 'prev_page_key', key: 'PageUp', run: a.prev },
    { name: 'next_down', key: 'ArrowDown', run: a.nextSlide, when: play },
    { name: 'prev_up', key: 'ArrowUp', run: a.prevSlide, when: play },
    { name: 'next_shift', key: 'shift+ArrowRight', run: a.nextSlide, when: play },
    { name: 'prev_shift', key: 'shift+ArrowLeft', run: a.prevSlide, when: play },
    { name: 'toggle_dark', key: 'd', run: a.toggleDark, when: notDrawing },
    { name: 'toggle_overview', key: 'o', run: a.toggleOverview, when: notDrawing },
    { name: 'toggle_overview_backtick', key: '`', run: a.toggleOverview, when: notDrawing },
    { name: 'hide_overview', key: 'Escape', run: a.closeAll, when: notDrawing },
    { name: 'goto', key: 'g', run: a.toggleGoto, when: notDrawing },
    { name: 'fullscreen', key: 'f', run: a.toggleFullscreen },
    {
      name: 'right_overview',
      key: 'ArrowRight',
      run: () => a.overviewMove('right'),
      when: overview,
    },
    { name: 'left_overview', key: 'ArrowLeft', run: () => a.overviewMove('left'), when: overview },
    { name: 'up_overview', key: 'ArrowUp', run: () => a.overviewMove('up'), when: overview },
    { name: 'down_overview', key: 'ArrowDown', run: () => a.overviewMove('down'), when: overview },
    { name: 'goto_from_overview', key: 'Enter', run: a.overviewGo, when: overview },
  ];
}

// Does the key event match the spec? Ctrl, Meta and Alt are never ours (browser shortcuts).
export function matches(
  e: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'>,
  spec: string,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const shift = spec.startsWith('shift+');
  const key = shift ? spec.slice(6) : spec;
  const pressed = e.key === ' ' ? 'space' : e.key;
  // A single character (d, o, g, `): Shift or Caps Lock only change its case, so compare without case.
  if (pressed.length === 1) return pressed.toLowerCase() === key.toLowerCase();
  return pressed === key && e.shiftKey === shift;
}

/** The shortcut that matches and is allowed right now; of two, the one added later (a later root's, the deck's) wins. */
export function findShortcut(e: KeyboardEvent, list: Shortcut[]): Shortcut | undefined {
  for (let i = list.length - 1; i >= 0; i--)
    if (matches(e, list[i].key) && (list[i].when?.() ?? true)) return list[i];
  return undefined;
}
