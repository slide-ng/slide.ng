import { Component, ElementRef, computed, inject } from '@angular/core';
import { UiTextKey } from '../i18n/en';
import { T } from '../i18n/t';
import {
  NavPositionName,
  deckNavPosition,
  isNavPosition,
  navPositionStep,
  readNavPosition,
} from '../lib/nav-position';
import { ViewPrefs } from '../lib/view-prefs';

// The rows of the grid as they are shown: the top one first.
const CELLS: NavPositionName[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

// Each place named by where it is on the screen. In a right-to-left page `left` is the start, on the right.
const LABELS: Record<NavPositionName, [UiTextKey, UiTextKey]> = {
  'top-left': ['settings.navTopLeft', 'settings.navTopRight'],
  'top-center': ['settings.navTopCenter', 'settings.navTopCenter'],
  'top-right': ['settings.navTopRight', 'settings.navTopLeft'],
  'bottom-left': ['settings.navBottomLeft', 'settings.navBottomRight'],
  'bottom-center': ['settings.navBottomCenter', 'settings.navBottomCenter'],
  'bottom-right': ['settings.navBottomRight', 'settings.navBottomLeft'],
};

// The place of the navigation bar on the slide page (lib/nav-position.ts): six places in a small picture of the page, as a
// radio group, and "Deck default" to follow the headmatter again. The grid follows the writing direction like the bar.
@Component({
  selector: 'app-nav-position-settings',
  imports: [T],
  templateUrl: './nav-position-settings.html',
})
export class NavPositionSettings {
  protected prefs = inject(ViewPrefs);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private rtl = getComputedStyle(document.documentElement).direction === 'rtl';
  protected cells = CELLS.map((value) => ({
    value,
    ...readNavPosition(value),
    label: LABELS[value][this.rtl ? 1 : 0],
  }));
  /** The place the bar is at now: the chosen one, else the deck's own. */
  protected current = computed(() => {
    const chosen = this.prefs.navPosition();
    return isNavPosition(chosen) ? chosen : deckNavPosition();
  });

  protected choose(place: NavPositionName | null) {
    this.prefs.navPosition.set(place);
  }

  // The arrow keys move through the grid (as in a radio group) instead of through the slides.
  protected key(e: KeyboardEvent) {
    const next = navPositionStep(this.current(), e.key, this.rtl);
    if (!next) return;
    e.preventDefault();
    e.stopPropagation();
    if (next === this.current()) return; // at the edge: no choice is made
    this.choose(next);
    this.el.querySelector<HTMLElement>(`[data-nav-position="${next}"]`)?.focus();
  }
}
