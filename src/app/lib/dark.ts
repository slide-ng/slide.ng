import { Injectable, computed, effect, signal } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';

// The same key Slidev uses. Unlike the other settings it is not scoped by deck (deck-scope.ts): a reader who chose dark
// mode on one deck of a site wants it on the others too, as in Slidev.
const KEY = 'slidev-color-schema';

// What was stored last time: 'auto' (follow the system), 'light' or 'dark'. Storage may be blocked.
function stored(): string {
  try {
    return localStorage.getItem(KEY) ?? 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Dark mode. `colorSchema: light | dark` in the headmatter fixes it (no toggle); `auto` (default)
 * follows the system until the user toggles, and then remembers the choice in localStorage.
 */
@Injectable({ providedIn: 'root' })
export class Dark {
  private fixed = (HEADMATTER['colorSchema'] as string | undefined) ?? 'auto';
  private system = window.matchMedia('(prefers-color-scheme: dark)');
  /** True when the deck's headmatter fixes the colour scheme, so the toggle is hidden. */
  readonly isFixed = this.fixed !== 'auto';
  private choice = signal(stored());
  private systemDark = signal(this.system.matches);

  readonly isDark = computed(() => {
    if (this.isFixed) return this.fixed === 'dark';
    return this.choice() === 'auto' ? this.systemDark() : this.choice() === 'dark';
  });

  constructor() {
    this.system.addEventListener('change', (e) => this.systemDark.set(e.matches));
    // `dark` class on <html>: UnoCSS `dark:` classes and our CSS both use it.
    effect(() => {
      document.documentElement.classList.toggle('dark', this.isDark());
      document.documentElement.classList.toggle('light', !this.isDark());
    });
  }

  toggle() {
    if (this.isFixed) return;
    const dark = !this.isDark();
    const value = dark === this.systemDark() ? 'auto' : dark ? 'dark' : 'light';
    this.choice.set(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* the choice just is not remembered */
    }
  }
}
