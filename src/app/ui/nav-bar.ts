import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { NAV_CONTROLS } from '../../slides/generated/layers';
import { LANGUAGE_MENU } from '../../slides/generated/languages';
import { DeckBrowser } from '../browser/deck-browser';
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
import { navPositionAt } from '../lib/nav-position';
import { T } from '../i18n/t';
import { IconBtn } from './icon-btn';
import { SideEditorState } from '../dev/side-editor-state';
import { RecordingControls } from '../record/recording-controls';
import { Settings } from './settings';
import { SyncControls } from './sync-controls';
import { presenterEnabled } from '../lib/switches';

// The bar at the bottom left (Slidev's NavControls), or where `navPosition` puts it. The deck shows it only while the mouse is
// over that corner; the presenter page always shows it (`persist`, no frame around it).
@Component({
  selector: 'app-nav-bar',
  imports: [IconBtn, Settings, RecordingControls, SyncControls, NgComponentOutlet, T],
  host: {
    '(document:click)': 'closeSettingsOutside($event)',
    '(window:resize)': 'fitSettings()',
    '(window:keydown.escape)': 'dragCancel()',
  },
  templateUrl: './nav-bar.html',
})
export class NavBar {
  /** The presenter page keeps the bar open and drops its frame. */
  persist = input(false);
  /** The bar is at the top of the page (`navPosition`): its menus open below it. */
  menusBelow = input(false);
  protected nav = inject(Nav);
  protected drawings = inject(Drawings);
  protected editor = inject(SideEditorState);
  protected prefs = inject(PresenterPrefs);
  protected ui = inject(Ui);
  protected dark = inject(Dark);
  protected fullscreen = inject(Fullscreen);
  protected download = inject(Download);
  protected browser = inject(DeckBrowser);
  private view = inject(ViewPrefs);
  protected customControls = NAV_CONTROLS;
  /** As in Slidev, the sync menu is there whenever the deck has a presenter (and so window sync). */
  protected syncControls = presenterEnabled();
  /** Headmatter `languages`: the language menu. Only such a deck has its code (the generated languages.ts imports it). */
  protected languageMenu = signal<Type<unknown> | null>(null);
  protected filtered = computed(() =>
    (Object.keys(defaultFilters) as (keyof Filters)[]).some(
      (k) => this.view.filters()[k] !== defaultFilters[k],
    ),
  );
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private settingsMenu = viewChild<ElementRef<HTMLElement>>('settingsMenu');

  constructor() {
    void LANGUAGE_MENU?.().then((menu) => this.languageMenu.set(menu));
    // Also when the bar moves (a place chosen in the menu): the menu is fitted again where it now is.
    afterRenderEffect(() => {
      this.view.navPosition();
      this.menusBelow();
      if (this.settingsMenu()) this.fitSettings();
    });
  }

  // Inside the window, however narrow or short it is (lib/fit-menu.ts).
  fitSettings() {
    const menu = this.settingsMenu()?.nativeElement;
    if (menu) fitMenu(menu);
  }

  // Escape anywhere in the settings menu (also in a number field, which keeps its keys from the page) closes it, and the
  // focus goes back to the button instead of to the page.
  protected closeSettings(e: Event) {
    if ((e as KeyboardEvent).isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    this.ui.settings.set(false);
    this.el.querySelector<HTMLElement>('#nav-settings')?.focus();
  }

  private drag: { x: number; y: number; page: DOMRect; rtl: boolean } | null = null;

  protected dragStart(e: PointerEvent) {
    if (this.drag || !e.isPrimary || e.button !== 0) return;
    const page = this.el.closest('main')?.getBoundingClientRect();
    if (!page) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const rtl = getComputedStyle(this.el).direction === 'rtl';
    this.drag = { x: e.clientX, y: e.clientY, page, rtl };
    this.ui.closeAll();
    this.ui.barDrag.set({ dx: 0, dy: 0, over: this.dropAt(e) });
  }

  protected dragMove(e: PointerEvent) {
    if (!this.drag || !e.isPrimary) return;
    const { x, y } = this.drag;
    this.ui.barDrag.set({ dx: e.clientX - x, dy: e.clientY - y, over: this.dropAt(e) });
  }

  protected dragEnd(e: PointerEvent) {
    if (!this.drag || !e.isPrimary) return;
    const place = this.dropAt(e);
    this.dragCancel();
    if (place) this.view.navPosition.set(place);
  }

  protected dragCancel() {
    if (!this.drag) return;
    this.drag = null;
    this.ui.barDrag.set(null);
  }

  private dropAt(e: PointerEvent) {
    const { page, rtl } = this.drag!;
    return navPositionAt(e.clientX - page.left, e.clientY - page.top, page.width, page.height, rtl);
  }

  // A click anywhere outside the bar closes the settings menu.
  closeSettingsOutside(e: MouseEvent) {
    if (this.ui.settings() && !this.el.contains(e.target as Node)) this.ui.settings.set(false);
  }
}
