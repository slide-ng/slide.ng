import { Component, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SLIDES, HEADMATTER } from '../../slides/generated';
import { Dark } from '../lib/dark';
import { Fullscreen } from '../lib/fullscreen';
import { storedSignal } from '../lib/stored-signal';
import { SyncState } from '../sync/sync-state';
import { IconBtn } from '../ui/icon-btn';
import { T } from '../i18n/t';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { ClicksSlider } from './clicks-slider';
import { NoteDisplay } from './note-display';
import { ProgressBar } from './progress-bar';
import { TimerBar } from './timer-bar';

// The route /notes: only the notes, for a second screen or another device. It follows the
// presenter (page and click come from the shared state) and has no navigation of its own.
@Component({
  selector: 'app-notes-page',
  imports: [ProgressBar, TimerBar, NoteDisplay, ClicksSlider, IconBtn, T],
  host: { class: 'block h-full' },
  template: `
    <div class="bg-main text-main h-full flex flex-col">
      <app-progress-bar
        [current]="page()"
        [clicks]="state().clicks"
        [clicksTotal]="state().clicksTotal"
        [total]="total"
      />
      <app-timer-bar />
      <div
        id="notes-scroller"
        class="px-5 py-3 flex-auto h-full overflow-auto"
        [style.font-size.px]="fontSize()"
      >
        <app-note-display
          [html]="html()"
          [clicks]="state().clicks"
          [placeholder]="'presenter.noNotes' | t: { no: page() }"
          [autoScroll]="true"
        />
      </div>
      <div class="flex-none border-t border-main px-3 py-2">
        <app-clicks-slider
          [current]="state().clicks"
          [total]="state().clicksTotal"
          [readonly]="true"
        />
      </div>
      <div class="flex-none border-t border-main">
        <div class="flex gap-1 items-center px-6 py-3">
          <button icon-btn [title]="'nav.fullscreenEnter' | t" (click)="fullscreen.toggle()">
            <div class="i-carbon:maximize"></div>
          </button>
          <button
            icon-btn
            id="notes-bigger"
            [title]="'presenter.fontBigger' | t"
            (click)="fontSize.set(fontSize() + 1)"
          >
            <div class="i-carbon:zoom-in"></div>
          </button>
          <button
            icon-btn
            id="notes-smaller"
            [title]="'presenter.fontSmaller' | t"
            (click)="fontSize.set(fontSize() - 1)"
          >
            <div class="i-carbon:zoom-out"></div>
          </button>
          <div class="flex-auto"></div>
          <div id="notes-counter" class="px-2 my-auto">
            <span class="text-lg">{{ page() }}</span
            ><span class="opacity-65 text-sm"> / {{ total }}</span>
          </div>
        </div>
      </div>
    </div>
    <div id="hud" aria-hidden="true">
      slide {{ page() }}/{{ total }} clicks {{ state().clicks }}/{{ state().clicksTotal }}
    </div>
  `,
})
export class NotesPage {
  protected fullscreen = inject(Fullscreen);
  private sync = inject(SyncState);
  protected state = this.sync.shared;
  protected total = SLIDES.length;
  protected fontSize = storedSignal('slidev-notes-font-size', 18);
  // Until a presenter says where it is, show slide 1.
  protected page = computed(() => Math.min(Math.max(this.state().page, 1), this.total));
  protected html = computed(() => SLIDES[this.page() - 1].noteHtml);

  constructor() {
    const title = String(HEADMATTER['title'] ?? 'slide.ng');
    inject(Title).setTitle(uiText(inject(UI_TEXT), 'notes.pageTitle', { title }));
    inject(Dark); // the deck's colour scheme (colorSchema, the system or the last choice) on <html>
    this.sync.sendHello(); // the presenter answers with where it is
  }
}
