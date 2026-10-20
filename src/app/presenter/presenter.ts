import { Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { keyHandler } from '../lib/key-handler';
import { DragControls } from '../drag/drag-controls';
import { Drawings } from '../drawing/drawings';
import { DrawingControls } from '../drawing/drawing-controls';
import { DrawingLayer } from '../drawing/drawing-layer';
import { Nav } from '../lib/nav';
import { SlideShow } from '../lib/slide-show';
import { Ui } from '../lib/ui-state';
import { startNavSync } from '../sync/nav-sync';
import { ContextMenu } from '../ui/context-menu';
import { Goto } from '../ui/goto';
import { NavBar } from '../ui/nav-bar';
import { Overview } from '../ui/overview';
import { WebCamera } from '../record/web-camera';
import { ScreenMirror } from '../record/screen-mirror';
import { ClickPreviewLayer } from './click-preview-layer';
import { ClicksSlider } from './clicks-slider';
import { NextPreview } from './next-preview';
import { NoteDisplay } from './note-display';
import { PresenterPrefs } from './prefs';
import { PresenterCursor } from './presenter-cursor';
import { contextMenuEnabled } from '../lib/switches';
import { ProgressBar } from './progress-bar';
import { TimerBar } from './timer-bar';
import { TimerInlined } from './timer-inlined';

// The route /presenter/:no: the current slide, the next step, the notes and the timer.
// It drives the other windows (see sync/nav-sync.ts). Same navigation as the play page.
@Component({
  selector: 'app-presenter',
  imports: [
    SlideShow,
    PresenterCursor,
    DrawingLayer,
    DrawingControls,
    DragControls,
    NextPreview,
    NoteDisplay,
    NavBar,
    ProgressBar,
    TimerBar,
    TimerInlined,
    ClicksSlider,
    ClickPreviewLayer,
    WebCamera,
    ScreenMirror,
    Overview,
    Goto,
    ContextMenu,
  ],
  providers: [Nav, Ui, Drawings],
  host: { '(window:keydown)': 'key($event)', class: 'block h-full' },
  template: `
    <div
      class="bg-main text-main h-full slidev-presenter grid grid-rows-[max-content_1fr] of-hidden"
    >
      <div>
        <app-progress-bar
          [current]="nav.no()"
          [clicks]="nav.clicks()"
          [clicksTotal]="nav.clicksTotal()"
          [total]="nav.total"
        />
        <app-timer-bar />
      </div>
      <div
        class="grid-container"
        [class]="'layout' + prefs.layout()"
        (contextmenu)="contextMenu($event)"
      >
        <div class="relative grid-section main flex flex-col">
          <div class="flex gap-4 items-center border-b border-main p-1">
            <span class="op50 px-2">Current</span>
            <div class="flex rounded border border-main overflow-hidden text-sm ml-auto">
              <button
                type="button"
                id="main-slides"
                class="px-2 py-0.5"
                [class.bg-active]="!mirror()"
                (click)="mirror.set(false)"
              >
                Slides
              </button>
              <button
                type="button"
                id="main-mirror"
                class="px-2 py-0.5"
                [class.bg-active]="mirror()"
                (click)="mirror.set(true)"
              >
                Screen Mirror
              </button>
            </div>
          </div>
          <div class="relative flex-auto p-2 lg:p-4" [style.display]="mirror() ? 'none' : null">
            <div class="relative h-full w-full">
              <app-slide-show context="presenter">
                @if (prefs.clickPreview()) {
                  <app-click-preview />
                }
                <app-drawing-layer /><app-drag-controls /><app-presenter-cursor
              /></app-slide-show>
            </div>
          </div>
          <div class="relative flex-auto p-2 lg:p-4" [style.display]="mirror() ? null : 'none'">
            <app-screen-mirror />
          </div>
          <app-clicks-slider
            class="w-full pb-2 px-4 flex-none"
            [current]="nav.clicks()"
            [total]="nav.clicksTotal()"
            [start]="nav.ctx()?.clicksStart ?? 0"
            (picked)="nav.ctx()?.setCurrent($event)"
          />
        </div>
        <div class="relative grid-section next flex flex-col p-2 lg:p-4">
          <app-next-preview />
          <div
            class="absolute left-0 top-0 bg-main border-b border-r border-main px-2 py-1 op50 text-sm"
          >
            Next
          </div>
        </div>
        <div class="relative grid-section note overflow-hidden">
          <div class="h-full grid grid-rows-[1fr_min-content]">
            <div class="overflow-auto" [style.font-size.em]="prefs.fontSize()">
              <app-note-display
                [html]="nav.meta().noteHtml"
                [clicks]="nav.clicks()"
                [placeholder]="'No notes for Slide ' + nav.no() + '.'"
                (markerDblclick)="nav.ctx()?.setCurrent($event)"
              />
            </div>
            <div class="border-t border-main py-1 px-2 text-sm">
              <button
                icon-btn
                id="notes-bigger"
                title="Increase font size"
                (click)="prefs.bigger()"
              >
                <div class="i-carbon:zoom-in"></div>
              </button>
              <button
                icon-btn
                id="notes-smaller"
                title="Decrease font size"
                (click)="prefs.smaller()"
              >
                <div class="i-carbon:zoom-out"></div>
              </button>
            </div>
          </div>
        </div>
        <div class="grid-section bottom flex">
          <app-nav-bar [persist]="true" />
          <div class="flex-auto"></div>
          <app-timer-inlined />
        </div>
      </div>
    </div>
    <app-drawing-controls />
    <app-web-camera />
    <app-goto />
    <app-overview />
    <app-context-menu />
    <div id="hud" aria-hidden="true">
      slide {{ nav.no() }}/{{ nav.total }} clicks {{ nav.clicks() }}/{{ nav.clicksTotal() }}
    </div>
    <!-- As on the deck page: screen readers hear the new slide's number and title -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</div>
  `,
})
export class Presenter {
  protected nav = inject(Nav);
  protected announcement = computed(() => {
    const no = this.nav.no();
    const title = SLIDES[no - 1]?.title;
    return `Slide ${no} of ${this.nav.total}${title ? `: ${title}` : ''}`;
  });
  protected prefs = inject(PresenterPrefs);
  private ui = inject(Ui);
  /** The main pane shows a shared screen instead of the slides. */
  protected mirror = signal(false);
  protected key = keyHandler(this.nav, this.ui);

  constructor() {
    inject(Title).setTitle(`Presenter - ${HEADMATTER['title'] ?? 'slide.ng'}`);
    startNavSync(this.nav);
  }

  // Shift + right click keeps the browser's own menu.
  contextMenu(e: MouseEvent) {
    if (e.shiftKey || e.defaultPrevented || !contextMenuEnabled()) return;
    e.preventDefault();
    this.ui.contextMenu.set({ x: e.pageX, y: e.pageY });
  }
}
