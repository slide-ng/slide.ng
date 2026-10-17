import { Component, computed, inject } from '@angular/core';
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
import { contextMenuEnabled } from './lib/switches';
import { SlideShow } from './lib/slide-show';
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
  host: { '(window:keydown)': 'key($event)', '(click)': 'anchor($event)' },
  template: `
    <div
      class="stage"
      [style.right.px]="editor.open() && editor.available() ? editor.width : 0"
      [class.slidev-nav-go-forward]="nav.direction() > 0"
      [class.slidev-nav-go-backward]="nav.direction() < 0"
      (contextmenu)="contextMenu($event)"
      (pointerdown)="swipeStart($event)"
      (pointerup)="swipeEnd($event)"
    >
      <app-slide-show context="slide"
        ><app-drawing-layer /><app-drag-controls /><app-presenter-cursor
      /></app-slide-show>
      <div
        class="absolute bottom-0 left-0 p-2 transition duration-300 opacity-0 hover:opacity-100 focus-within:opacity-100"
      >
        <app-nav-bar />
      </div>
      <app-offline-badge />
    </div>
    <app-drawing-controls />
    <app-web-camera />
    <app-side-editor />
    <app-overview />
    <app-goto />
    <app-info-dialog />
    <app-context-menu />
    <app-problem-banner />
    <div id="hud">
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
    return `Slide ${no} of ${this.nav.total}${title ? `: ${title}` : ''}`;
  });
  protected editor = inject(SideEditorState);
  protected key = keyHandler(this.nav, this.ui);
  private drawings = inject(Drawings);
  private swipeFrom: { x: number; y: number } | null = null;

  constructor() {
    hideIdleCursor(() => this.ui.hideIdleCursor());
    startNavSync(this.nav);
  }

  // Touch swipes move through the deck (not while drawing, as in Slidev).
  swipeStart(e: PointerEvent) {
    this.swipeFrom =
      e.pointerType === 'touch' && !this.drawings.enabled() ? { x: e.clientX, y: e.clientY } : null;
  }

  swipeEnd(e: PointerEvent) {
    const from = this.swipeFrom;
    this.swipeFrom = null;
    if (!from || e.pointerType !== 'touch' || this.drawings.enabled()) return;
    const action = swipeAction(
      e.clientX - from.x,
      e.clientY - from.y,
      window.innerWidth,
      window.innerHeight,
    );
    if (action) this.nav[action]();
  }

  // Shift + right click keeps the browser's own menu.
  contextMenu(e: MouseEvent) {
    if (e.shiftKey || e.defaultPrevented || !contextMenuEnabled()) return;
    e.preventDefault();
    this.ui.contextMenu.set({ x: e.pageX, y: e.pageY });
  }
}
