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
  template: `
    <div class="slidev-form-item">
      <span id="nav-position-title" class="slidev-form-title" (dblclick)="choose(null)">
        {{ 'settings.navPosition' | t }}
        @if (prefs.navPosition() !== null) {
          <i class="slidev-form-dot"></i>
        }
      </span>
      <div class="flex gap-2 items-center">
        <div
          id="nav-position"
          role="radiogroup"
          aria-labelledby="nav-position-title"
          class="grid grid-cols-3 gap-0.5 p-0.5 rounded border border-main"
          (keydown)="key($event)"
        >
          @for (c of cells; track c.value) {
            <button
              type="button"
              role="radio"
              class="nav-position-option flex w-7 h-5 p-0.5 rounded cursor-pointer hover:bg-gray-400/10"
              [class.items-start]="c.edge === 'top'"
              [class.items-end]="c.edge === 'bottom'"
              [class.justify-start]="c.side === 'start'"
              [class.justify-center]="c.side === 'center'"
              [class.justify-end]="c.side === 'end'"
              [attr.data-nav-position]="c.value"
              [attr.aria-checked]="current() === c.value"
              [attr.tabindex]="current() === c.value ? 0 : -1"
              [attr.aria-label]="c.label | t"
              [title]="c.label | t"
              (click)="choose(c.value)"
            >
              <div
                class="w-3 h-1 rounded-sm"
                [class]="current() === c.value ? 'bg-primary' : 'bg-current op25'"
              ></div>
            </button>
          }
        </div>
        <button
          type="button"
          id="nav-position-default"
          class="px-2 py-1 text-xs whitespace-nowrap rounded cursor-pointer hover:bg-gray-400/10"
          [class.op65]="prefs.navPosition() !== null"
          [attr.aria-pressed]="prefs.navPosition() === null"
          (click)="choose(null)"
        >
          {{ 'settings.navPositionDefault' | t }}
        </button>
      </div>
    </div>
  `,
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
