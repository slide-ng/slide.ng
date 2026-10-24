import { Component, computed, inject, signal } from '@angular/core';
import { SLIDES } from '../slides/generated';
import { DragControls } from './drag/drag-controls';
import { ProblemBanner } from './dev/problem-banner';
import { SideEditor } from './dev/side-editor';
import { SideEditorState } from './dev/side-editor-state';
import { WebCamera } from './record/web-camera';
import { hideIdleCursor } from './lib/idle-cursor';
import { Drawings } from './drawing/drawings';
import { DrawingControls } from './drawing/drawing-controls';
import { DrawingLayer } from './drawing/drawing-layer';
import { Nav } from './lib/nav';
import { swipeAction } from './lib/swipe';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './lib/canvas';
import { contextMenuEnabled } from './lib/switches';
import { navPosition } from './lib/nav-position';
import { SlideShow } from './lib/slide-show';
import { ViewPrefs } from './lib/view-prefs';
import { keyHandler } from './lib/key-handler';
import { Ui } from './lib/ui-state';
import { PresenterCursor } from './presenter/presenter-cursor';
import { startNavSync } from './sync/nav-sync';
import { ContextMenu } from './ui/context-menu';
import { Goto } from './ui/goto';
import { InfoDialog } from './ui/info-dialog';
import { NavBar } from './ui/nav-bar';
import { OfflineBadge } from './ui/offline-badge';
import { Overview } from './ui/overview';

// The route /:no, the audience's page. Shows one slide on a scaled canvas and hosts the controls around it.
@Component({
  selector: 'app-deck',
  imports: [
    SlideShow,
    PresenterCursor,
    DrawingLayer,
    DrawingControls,
    DragControls,
    WebCamera,
    SideEditor,
    NavBar,
    Overview,
    Goto,
    InfoDialog,
    ContextMenu,
    OfflineBadge,
    ProblemBanner,
  ],
  providers: [Nav, Ui, Drawings],
  host: {
    '(window:keydown)': 'key($event)',
    '(window:resize)':
      'size.set({ w: $any($event.target).innerWidth, h: $any($event.target).innerHeight })',
    '(click)': 'anchor($event)',
  },
  template: `
    <main
      class="stage"
      [style.right.px]="editor.open() && editor.available() ? editor.width : 0"
      [class.slidev-nav-go-forward]="nav.direction() > 0"
      [class.slidev-nav-go-backward]="nav.direction() < 0"
      (contextmenu)="contextMenu($event)"
      (touchstart)="swipeStart($event)"
      (touchmove)="swipeMove($event)"
      (touchend)="swipeEnd()"
      (touchcancel)="swipeCancel()"
    >
      <app-slide-show context="slide"
        ><app-drawing-layer /><app-drag-controls /><app-presenter-cursor
      /></app-slide-show>
      <div
        class="nav-bar-box absolute p-2 transition duration-300 opacity-0 hover:opacity-100 focus-within:opacity-100"
        [class.top-0]="bar().edge === 'top'"
        [class.bottom-0]="bar().edge === 'bottom'"
        [class.start-0]="bar().side === 'start'"
        [class.end-0]="bar().side === 'end'"
        [class.inset-x-0]="bar().side === 'center'"
        [class.mx-auto]="bar().side === 'center'"
        [class.w-fit]="bar().side === 'center'"
        [style.opacity]="portrait() || barShown() ? 1 : null"
        (touchstart)="revealBar($event)"
      >
        <app-nav-bar [menusBelow]="bar().edge === 'top'" />
      </div>
      <app-offline-badge />
    </main>
    <app-drawing-controls />
    <app-web-camera />
    <app-side-editor />
    <app-overview />
    <app-goto />
    <app-info-dialog />
    <app-context-menu />
    <app-problem-banner />
    <div id="hud" aria-hidden="true">
      slide {{ nav.no() }}/{{ nav.total }} clicks {{ nav.clicks() }}/{{ nav.clicksTotal() }}
    </div>
    <!-- Screen readers hear the new slide's number and title (not every click) -->
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement() }}</div>
  `,
})
export class Deck {
  protected nav = inject(Nav);
  private ui = inject(Ui);
  // `[results](#results)` to a heading of the same slide: the page's <base href> would turn it into another address and
  // leave the deck, so the slide scrolls to the element instead. `#/3` (hash routing) is a slide address and stays as it is.
  protected anchor(e: MouseEvent) {
    const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
    const id = link?.getAttribute('href')?.slice(1);
    if (!link || !id || id.startsWith('/')) return;
    e.preventDefault();
    document.getElementById(decodeURIComponent(id))?.scrollIntoView({ block: 'nearest' });
  }
  protected announcement = computed(() => {
    const no = this.nav.no();
    const title = SLIDES[no - 1]?.title;
    const total = this.nav.total;
    return this.ui.text(title ? 'deck.announceTitle' : 'deck.announce', { no, total, title });
  });
  protected editor = inject(SideEditorState);
  protected key = keyHandler(this.nav, this.ui);
  private drawings = inject(Drawings);
  private swipeFrom: { x: number; y: number } | null = null;
  private swipeAt = { x: 0, y: 0 };
  // On a screen taller than the slide (a phone held upright) the bar always shows below it, as in Slidev: there is no
  // hover there.
  protected size = signal({ w: window.innerWidth, h: window.innerHeight });
  protected portrait = computed(
    () => this.size().h - (this.size().w * CANVAS_HEIGHT) / CANVAS_WIDTH > 120,
  );
  // A touch has no hover: the first tap on the hidden bar only shows it, a touch elsewhere hides it again.
  protected barShown = signal(false);
  // Where the bar sits: the place chosen in the settings menu, else the headmatter's `navPosition`. It moves as soon as
  // the choice changes.
  private view = inject(ViewPrefs);
  protected bar = computed(() => navPosition(this.view.navPosition()));

  constructor() {
    hideIdleCursor(() => this.ui.hideIdleCursor());
    startNavSync(this.nav);
  }

  // Touch swipes move through the deck (not while drawing, as in Slidev).
  // One finger. Touch events, not pointer events: the stage has `touch-action: pan-y` (styles.css), and once the browser
  // takes an up or down swipe as panning it cancels the pointer, while touchmove still comes.
  // A finger on a slide-ng-drag element or one of its handles moves that element, not the deck.
  swipeStart(e: TouchEvent) {
    const t = e.touches[0];
    const target = e.target as Element | null;
    if (!target?.closest?.('.nav-bar-box')) this.barShown.set(false);
    const onDrag = !!target?.closest?.(
      '[slide-ng-drag], slide-ng-drag, [data-drag-ui], .drag-grab',
    );
    this.swipeFrom =
      e.touches.length === 1 && !this.drawings.enabled() && !onDrag
        ? { x: t.clientX, y: t.clientY }
        : null;
    if (this.swipeFrom) this.swipeAt = { ...this.swipeFrom };
  }

  revealBar(e: TouchEvent) {
    const box = e.currentTarget as HTMLElement;
    if (this.portrait() || this.barShown() || box.matches(':hover, :focus-within')) return;
    e.preventDefault(); // no click on the button under the finger
    this.barShown.set(true);
  }

  swipeMove(e: TouchEvent) {
    if (e.touches.length > 1) this.swipeFrom = null; // a pinch
    const t = e.touches[0];
    if (this.swipeFrom && t) this.swipeAt = { x: t.clientX, y: t.clientY };
  }

  swipeCancel() {
    this.swipeFrom = null;
  }

  swipeEnd() {
    const from = this.swipeFrom;
    this.swipeFrom = null;
    if (!from || this.drawings.enabled()) return;
    const to = this.swipeAt;
    const action = swipeAction(to.x - from.x, to.y - from.y, window.innerWidth, window.innerHeight);
    if (action) this.nav[action]();
  }

  // Shift + right click keeps the browser's own menu.
  contextMenu(e: MouseEvent) {
    if (e.shiftKey || e.defaultPrevented || !contextMenuEnabled()) return;
    e.preventDefault();
    this.ui.contextMenu.set({ x: e.pageX, y: e.pageY });
  }
}
