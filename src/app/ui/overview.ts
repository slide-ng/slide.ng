import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { focusWhileOpen } from '../lib/dialog-focus';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { T } from '../i18n/t';
import { IconBtn } from './icon-btn';
import { Thumbnail } from './thumbnail';

// The slide overview (key `o`, Slidev's QuickOverview): every slide as a live thumbnail.
// Click a card to go there. Arrows move the highlight, Enter goes, Escape closes (see shortcuts.ts).
@Component({
  selector: 'app-overview',
  imports: [Thumbnail, IconBtn, T, RouterLink],
  host: { '(window:resize)': 'measure()', '(window:blur)': 'keepFocus()' },
  template: `
    @if (ui.overview()) {
      <div
        id="overview"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'overview.label' | t"
        tabindex="-1"
        class="outline-none fixed inset-0 z-modal bg-main bg-opacity-75! px-4 sm:px-16 py-20 overflow-y-auto backdrop-blur-5px select-none text-main"
        (click)="close()"
      >
        <div
          class="grid gap-y-4 gap-x-8 w-full"
          [style.grid-template-columns]="'repeat(auto-fit, minmax(' + cardWidth() + 'px, 1fr))'"
        >
          @for (slide of nav.slides; track $index) {
            <div class="relative">
              <button
                type="button"
                class="overview-card inline-block text-start border rounded overflow-hidden bg-main hover:border-primary transition cursor-pointer"
                [class]="ui.overviewPage() === $index + 1 ? 'border-primary' : 'border-main'"
                [attr.data-no]="$index + 1"
                [attr.aria-label]="
                  slide.title
                    ? ('overview.goToTitle' | t: { no: $index + 1, title: slide.title })
                    : ('overview.goTo' | t: { no: $index + 1 })
                "
                [attr.aria-current]="nav.no() === $index + 1 ? 'true' : null"
                (click)="go($index + 1, $event)"
              >
                @defer (on viewport) {
                  <app-thumbnail [no]="$index + 1" [width]="cardWidth()" />
                } @placeholder {
                  <div
                    [style.width.px]="cardWidth()"
                    [style.height.px]="(cardWidth() * 9) / 16"
                  ></div>
                }
              </button>
              <div
                class="absolute top-0 opacity-65"
                [style.inset-inline-start.px]="cardWidth() + 5"
              >
                {{ $index + 1 }}
              </div>
            </div>
          }
        </div>
      </div>
      <div class="fixed top-4 end-4 z-modal text-gray-400 flex gap-1">
        <a
          id="overview-page-link"
          class="slidev-icon-btn text-2xl"
          [title]="'overview.openPage' | t"
          [attr.aria-label]="'overview.openPage' | t"
          routerLink="/overview"
          (click)="close()"
        >
          <div class="i-carbon:list-boxes"></div>
        </a>
        <button
          icon-btn
          id="overview-close"
          class="text-2xl"
          [title]="'overview.close' | t"
          (click)="close()"
        >
          <div class="i-carbon:close"></div>
        </button>
      </div>
    }
  `,
})
export class Overview {
  protected ui = inject(Ui);
  protected nav = inject(Nav);
  protected width = signal(window.innerWidth);
  // The side padding (px-4, sm:px-16). A phone gets narrower cards, with room for the slide number beside them.
  private padding = computed(() => (this.width() < 640 ? 32 : 128));
  protected cardWidth = computed(() => Math.min(300, this.width() - this.padding() - 40));
  // Looked up by id, not kept in a viewChild: a query signal holds its last element until it is read again, which kept every
  // card of a closed overview (thousands of nodes in a long deck) in memory.
  private dialog = () => document.getElementById('overview') ?? undefined;
  private closeButton = () => document.getElementById('overview-close') ?? undefined;
  private pageLink = () => document.getElementById('overview-page-link') ?? undefined;

  // A page in a thumbnail's iframe that focuses itself would take the keys (Escape, arrows) away from the overview; the
  // thumbnails are inert, but a frame's own script can still focus it. Take the focus back.
  protected keepFocus() {
    setTimeout(() => {
      const active = document.activeElement;
      if (this.ui.overview() && active instanceof HTMLIFrameElement && active.closest('#overview'))
        this.dialog()?.focus();
    });
  }

  constructor() {
    focusWhileOpen(
      this.ui.overview,
      () => this.dialog(),
      () => [this.pageLink(), this.closeButton()],
    );
    effect(() => {
      // Every time the overview opens, highlight the slide on screen, and tell the keys how wide a row is.
      if (!this.ui.overview()) return;
      untracked(() => {
        this.ui.overviewPage.set(this.nav.no());
        this.ui.overviewColumns.set(
          Math.max(1, Math.floor((this.width() - this.padding()) / (this.cardWidth() + 32))),
        );
      });
    });
    // The arrow keys move the highlight (Ui.overviewPage); once the focus is in the overview it moves with it, so a screen
    // reader says which slide is highlighted. Just opened, the dialog itself keeps the focus.
    effect(() => {
      const no = this.ui.overviewPage();
      if (!this.ui.overview()) return;
      const dialog = this.dialog();
      const active = document.activeElement;
      if (!dialog || !(active === dialog || active?.classList.contains('overview-card'))) return;
      const card = dialog.querySelector<HTMLElement>(`.overview-card[data-no="${no}"]`);
      if (card && card !== active) card.focus();
    });
  }

  measure() {
    this.width.set(window.innerWidth);
  }

  close() {
    this.ui.overview.set(false);
  }

  go(no: number, e: Event) {
    e.stopPropagation(); // the backdrop would close the overview a second time
    this.nav.go(no);
    this.close();
  }
}
