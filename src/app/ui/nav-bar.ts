import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  viewChild,
} from '@angular/core';
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
import { fitMenu } from '../lib/fit-menu';
import { T } from '../i18n/t';
import { IconBtn } from './icon-btn';
import { SideEditorState } from '../dev/side-editor-state';
import { RecordingControls } from '../record/recording-controls';
import { Settings } from './settings';
import { SyncControls } from './sync-controls';
import { presenterEnabled } from '../lib/switches';

// The bar at the bottom left (Slidev's NavControls). The deck shows it only while the mouse is
// over that corner; the presenter page always shows it (`persist`, no frame around it).
@Component({
  selector: 'app-nav-bar',
  imports: [IconBtn, Settings, RecordingControls, SyncControls, NgComponentOutlet, T],
  host: {
    '(document:click)': 'closeSettingsOutside($event)',
    '(window:resize)': 'fitSettings()',
  },
  template: `
    <nav class="flex flex-col" [attr.data-fullscreen]="fullscreen.isFullscreen()">
      <div
        class="flex flex-wrap-reverse text-xl gap-0.5 p-1 lg:p-2 text-main"
        [class]="persist() ? 'bg-transparent' : 'rounded-md bg-main shadow-xl border border-main'"
      >
        <button
          icon-btn
          id="nav-fullscreen"
          [title]="(fullscreen.isFullscreen() ? 'nav.fullscreenExit' : 'nav.fullscreenEnter') | t"
          (click)="fullscreen.toggle()"
        >
          <div
            [class]="fullscreen.isFullscreen() ? 'i-carbon:minimize' : 'i-carbon:maximize'"
          ></div>
        </button>
        <button
          icon-btn
          id="nav-prev"
          [title]="'nav.prev' | t"
          [disabled]="!nav.hasPrev()"
          (click)="nav.prev()"
        >
          <div class="i-carbon:arrow-left rtl-flip"></div>
        </button>
        <button
          icon-btn
          id="nav-next"
          [title]="'nav.next' | t"
          [disabled]="!nav.hasNext()"
          (click)="nav.next()"
        >
          <div class="i-carbon:arrow-right rtl-flip"></div>
        </button>
        <button
          icon-btn
          id="nav-overview"
          [title]="'nav.overview' | t"
          (click)="ui.toggleOverview()"
        >
          <div class="i-carbon:apps"></div>
        </button>
        @if (!dark.isFixed) {
          <button
            icon-btn
            id="nav-dark"
            [title]="(dark.isDark() ? 'nav.darkOff' : 'nav.darkOn') | t"
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
              (prefs.cursorStyle() === 'laser'
                ? prefs.showCursor()
                  ? 'nav.laserOff'
                  : 'nav.laserOn'
                : prefs.showCursor()
                  ? 'nav.cursorHide'
                  : 'nav.cursorShow'
              ) | t
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
            [title]="(drawings.enabled() ? 'nav.drawingHide' : 'nav.drawingShow') | t"
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
          <button icon-btn id="nav-play" [title]="'nav.play' | t" (click)="nav.exitPresenter()">
            <div class="i-carbon:presentation-file"></div>
          </button>
        } @else {
          <button
            icon-btn
            id="nav-presenter"
            [title]="'nav.presenter' | t"
            (click)="nav.enterPresenter()"
          >
            <div class="i-carbon:user-speaker"></div>
          </button>
        }
        <!-- On the presenter page the editor takes the place of the notes (as in Slidev) -->
        @if (editor.available()) {
          <button
            icon-btn
            id="nav-editor"
            [title]="(editor.isOpen(persist()) ? 'nav.editorHide' : 'nav.editorShow') | t"
            [active]="editor.isOpen(persist())"
            (click)="editor.toggle(persist())"
          >
            <div class="i-carbon:text-annotation-toggle"></div>
          </button>
        }

        @if (download.wanted) {
          @if (download.available()) {
            <button
              icon-btn
              id="nav-download"
              [title]="'nav.download' | t"
              (click)="download.save()"
            >
              <div class="i-carbon:download"></div>
            </button>
          } @else {
            <button
              icon-btn
              id="nav-download"
              [title]="'nav.downloadMissing' | t"
              [disabled]="true"
            >
              <div class="i-carbon:download"></div>
            </button>
          }
        }

        @if (!nav.isPresenter) {
          <button icon-btn id="nav-info" [title]="'nav.info' | t" (click)="ui.info.set(!ui.info())">
            <div class="i-carbon:information"></div>
          </button>
        }

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        @if (nav.isPresenter) {
          <button
            icon-btn
            id="nav-layout"
            [title]="'nav.layout' | t"
            class="aspect-ratio-initial flex items-center"
            (click)="prefs.nextLayout()"
          >
            <div class="i-carbon:template"></div>
            <span id="nav-layout-no">{{ prefs.layout() }}</span>
          </button>
          <button
            icon-btn
            id="nav-click-preview"
            [title]="(prefs.clickPreview() ? 'nav.clickPreviewHide' : 'nav.clickPreviewShow') | t"
            [active]="prefs.clickPreview()"
            (click)="prefs.toggleClickPreview()"
          >
            <div [class]="prefs.clickPreview() ? 'i-carbon:view-filled' : 'i-carbon:view'"></div>
          </button>
        }

        @if (syncControls) {
          <app-sync-controls />
        }

        <div class="flex relative" #menu>
          <button
            icon-btn
            id="nav-settings"
            [title]="'nav.settings' | t"
            [active]="ui.settings()"
            aria-haspopup="true"
            [attr.aria-expanded]="ui.settings()"
            [attr.aria-controls]="ui.settings() ? 'settings-menu' : null"
            (click)="ui.settings.set(!ui.settings())"
          >
            <div class="i-carbon:settings-adjust"></div>
            @if (filtered()) {
              <div
                id="nav-settings-dot"
                class="w-2 h-2 bg-primary rounded-full absolute top-0.5 end-0.5"
              ></div>
            }
          </button>
          @if (ui.settings()) {
            <div
              #settingsMenu
              id="settings-menu"
              class="bg-main text-main shadow-xl absolute bottom-10 start-0 z-menu py-2 border border-main rounded-md max-w-[calc(100vw-1rem)] overflow-y-auto"
            >
              <app-settings />
            </div>
          }
        </div>

        <div class="w-1px opacity-10 bg-current m-1 lg:m-2"></div>

        <div id="nav-counter" class="px-2 my-auto">
          <span class="text-lg">{{ nav.no() }}</span>
          <span class="opacity-65 text-sm"> / {{ nav.total }}</span>
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
  /** As in Slidev, the sync menu is there whenever the deck has a presenter (and so window sync). */
  protected syncControls = presenterEnabled();
  protected filtered = computed(() =>
    (Object.keys(defaultFilters) as (keyof Filters)[]).some(
      (k) => this.view.filters()[k] !== defaultFilters[k],
    ),
  );
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private settingsMenu = viewChild<ElementRef<HTMLElement>>('settingsMenu');

  constructor() {
    afterRenderEffect(() => {
      if (this.settingsMenu()) this.fitSettings();
    });
  }

  // Inside the window, however narrow or short it is (lib/fit-menu.ts).
  fitSettings() {
    const menu = this.settingsMenu()?.nativeElement;
    if (menu) fitMenu(menu);
  }

  // A click anywhere outside the bar closes the settings menu.
  closeSettingsOutside(e: MouseEvent) {
    if (this.ui.settings() && !this.el.contains(e.target as Node)) this.ui.settings.set(false);
  }
}
