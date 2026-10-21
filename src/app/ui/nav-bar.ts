import { Component, ElementRef, computed, inject, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { NAV_CONTROLS } from '../../slides/generated/layers';
import { Drawings } from '../drawing/drawings';
import { Dark } from '../lib/dark';
import { Download } from '../lib/download';
import { Fullscreen } from '../lib/fullscreen';
import { Filters, defaultFilters } from '../lib/filters';
import { Nav } from '../lib/nav';
import { ViewPrefs } from '../lib/view-prefs';
import { PresenterPrefs } from '../presenter/prefs';
import { Ui } from '../lib/ui-state';
import { IconBtn } from './icon-btn';
import { SideEditorState } from '../dev/side-editor-state';
import { RecordingControls } from '../record/recording-controls';
import { Settings } from './settings';

// The bar at the bottom left (Slidev's NavControls). The deck shows it only while the mouse is
// over that corner; the presenter page always shows it (`persist`, no frame around it).
@Component({
  selector: 'app-nav-bar',
  imports: [IconBtn, Settings, RecordingControls, NgComponentOutlet],
  host: { '(document:click)': 'closeSettingsOutside($event)' },
  template: `
    <nav class="flex flex-col" [attr.data-fullscreen]="fullscreen.isFullscreen()">
      <div
        class="flex flex-wrap-reverse text-xl gap-0.5 p-1 lg:p-2 text-main"
        [class]="persist() ? 'bg-transparent' : 'rounded-md bg-main shadow-xl border border-main'"
      >
        <button
          icon-btn
          id="nav-fullscreen"
          [title]="fullscreen.isFullscreen() ? 'Close fullscreen' : 'Enter fullscreen'"
          (click)="fullscreen.toggle()"
        >
          <div
            [class]="fullscreen.isFullscreen() ? 'i-carbon:minimize' : 'i-carbon:maximize'"
          ></div>
        </button>
        <button
          icon-btn
          id="nav-prev"
          title="Go to previous slide"
          [disabled]="!nav.hasPrev()"
          (click)="nav.prev()"
        >
          <div class="i-carbon:arrow-left"></div>
        </button>
        <button
          icon-btn
          id="nav-next"
          title="Go to next slide"
          [disabled]="!nav.hasNext()"
          (click)="nav.next()"
        >
          <div class="i-carbon:arrow-right"></div>
        </button>
        <button
          icon-btn
          id="nav-overview"
          title="Show slide overview"
          (click)="ui.toggleOverview()"
        >
          <div class="i-carbon:apps"></div>
        </button>
        @if (!dark.isFixed) {
          <button
            icon-btn
            id="nav-dark"
            [title]="dark.isDark() ? 'Switch to light mode theme' : 'Switch to dark mode theme'"
            (click)="dark.toggle()"
          >
            <div [class]="dark.isDark() ? 'i-carbon-moon' : 'i-carbon-sun'"></div>
          </button>
        }

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        <app-recording-controls />

        @if (nav.isPresenter) {
          <button
            icon-btn
            id="nav-cursor"
            [active]="prefs.showCursor()"
            [title]="
              prefs.cursorStyle() === 'laser'
                ? prefs.showCursor()
                  ? 'Disable laser pointer'
                  : 'Enable laser pointer'
                : prefs.showCursor()
                  ? 'Hide presenter cursor'
                  : 'Show presenter cursor'
            "
            (click)="prefs.toggleCursor()"
          >
            @if (prefs.cursorStyle() === 'laser') {
              <div
                [class]="
                  prefs.showCursor()
                    ? 'i-carbon-magic-wand-filled color-red-600 dark:color-red-400'
                    : 'i-carbon-magic-wand'
                "
              ></div>
            } @else {
              <div [class]="prefs.showCursor() ? 'i-ph-cursor-fill' : 'i-ph-cursor-duotone'"></div>
            }
          </button>
        }
        @if (drawings.available) {
          <button
            icon-btn
            id="nav-drawing"
            class="relative"
            [title]="drawings.enabled() ? 'Hide drawing toolbar' : 'Show drawing toolbar'"
            [active]="drawings.enabled()"
            (click)="drawings.toggle()"
          >
            <div class="i-carbon:pen"></div>
            @if (drawings.enabled()) {
              <div
                class="absolute left-1 right-1 bottom-0 h-0.7 rounded-full"
                [style.background]="drawings.brush().color"
              ></div>
            }
          </button>
        }

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        @if (nav.isPresenter) {
          <button icon-btn id="nav-play" title="Play Mode" (click)="nav.exitPresenter()">
            <div class="i-carbon:presentation-file"></div>
          </button>
        } @else {
          <button icon-btn id="nav-presenter" title="Presenter Mode" (click)="nav.enterPresenter()">
            <div class="i-carbon:user-speaker"></div>
          </button>
          @if (editor.available()) {
            <button
              icon-btn
              id="nav-editor"
              [title]="editor.open() ? 'Hide editor' : 'Show editor'"
              [active]="editor.open()"
              (click)="editor.toggle()"
            >
              <div class="i-carbon:text-annotation-toggle"></div>
            </button>
          }
        }

        @if (download.wanted) {
          @if (download.available()) {
            <button icon-btn id="nav-download" title="Download as PDF" (click)="download.save()">
              <div class="i-carbon:download"></div>
            </button>
          } @else {
            <button
              icon-btn
              id="nav-download"
              title="Download as PDF (not in this build)"
              [disabled]="true"
            >
              <div class="i-carbon:download"></div>
            </button>
          }
        }

        @if (!nav.isPresenter) {
          <button icon-btn id="nav-info" title="Show info" (click)="ui.info.set(!ui.info())">
            <div class="i-carbon:information"></div>
          </button>
        }

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        @if (nav.isPresenter) {
          <button
            icon-btn
            id="nav-layout"
            title="Toggle Presenter Layout"
            class="aspect-ratio-initial flex items-center"
            (click)="prefs.nextLayout()"
          >
            <div class="i-carbon:template"></div>
            <span id="nav-layout-no">{{ prefs.layout() }}</span>
          </button>
        }

        <div class="flex relative" #menu>
          <button
            icon-btn
            id="nav-settings"
            title="More Options"
            [active]="ui.settings()"
            (click)="ui.settings.set(!ui.settings())"
          >
            <div class="i-carbon:settings-adjust"></div>
            @if (filtered()) {
              <div
                id="nav-settings-dot"
                class="w-2 h-2 bg-primary rounded-full absolute top-0.5 right-0.5"
              ></div>
            }
          </button>
          @if (ui.settings()) {
            <div
              id="settings-menu"
              class="bg-main text-main shadow-xl absolute bottom-10 left-0 z-menu py-2 border border-main rounded-md"
            >
              <app-settings />
            </div>
          }
        </div>

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        <div id="nav-counter" class="px-2 my-auto">
          <span class="text-lg">{{ nav.no() }}</span>
          <span class="opacity-50 text-sm"> / {{ nav.total }}</span>
        </div>

        <!-- Every root's layers/custom-nav-controls.ts (theme, addons, deck), last as in Slidev -->
        @if (customControls.length) {
          <div id="custom-nav-controls" class="flex">
            @for (controls of customControls; track $index) {
              <ng-container *ngComponentOutlet="controls" />
            }
          </div>
        }
      </div>
    </nav>
  `,
})
export class NavBar {
  /** The presenter page keeps the bar open and drops its frame. */
  persist = input(false);
  protected nav = inject(Nav);
  protected drawings = inject(Drawings);
  protected editor = inject(SideEditorState);
  protected prefs = inject(PresenterPrefs);
  protected ui = inject(Ui);
  protected dark = inject(Dark);
  protected fullscreen = inject(Fullscreen);
  protected download = inject(Download);
  private view = inject(ViewPrefs);
  protected customControls = NAV_CONTROLS;
  protected filtered = computed(() =>
    (Object.keys(defaultFilters) as (keyof Filters)[]).some(
      (k) => this.view.filters()[k] !== defaultFilters[k],
    ),
  );
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  // A click anywhere outside the bar closes the settings menu.
  closeSettingsOutside(e: MouseEvent) {
    if (this.ui.settings() && !this.el.contains(e.target as Node)) this.ui.settings.set(false);
  }
}
