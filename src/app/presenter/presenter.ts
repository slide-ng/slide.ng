import { Component, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { keyHandler } from '../lib/key-handler';
import { DragControls } from '../drag/drag-controls';
import { Drawings } from '../drawing/drawings';
import { DrawingControls } from '../drawing/drawing-controls';
import { DrawingLayer } from '../drawing/drawing-layer';
import { Nav } from '../lib/nav';
import { SlideShow } from '../lib/slide-show';
import { T } from '../i18n/t';
import { Ui } from '../lib/ui-state';
import { startNavSync } from '../sync/nav-sync';
import { ContextMenu } from '../ui/context-menu';
import { Goto } from '../ui/goto';
import { IconBtn } from '../ui/icon-btn';
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
import { DeckBrowser } from '../browser/deck-browser';
import { TimerInlined } from './timer-inlined';
import { NoteEditor } from './note-editor';
import { PaneResizers } from './pane-resizers';
import { SideEditor } from '../dev/side-editor';
import { SideEditorState } from '../dev/side-editor-state';
import { scopedKey } from '../lib/deck-scope';

const EDITING_NOTES = 'slide-ng-editing-notes';
function readEditing(): boolean {
  try {
    return sessionStorage.getItem(scopedKey(EDITING_NOTES)) === '1';
  } catch {
    return false;
  }
}

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
    IconBtn,
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
    T,
    NoteEditor,
    PaneResizers,
    SideEditor,
  ],
  providers: [Nav, Ui, Drawings],
  host: { '(window:keydown)': 'key($event)', class: 'block h-full' },
  templateUrl: './presenter.html',
})
export class Presenter {
  protected browser = inject(DeckBrowser);
  protected nav = inject(Nav);
  private ui = inject(Ui);
  protected announcement = computed(() => {
    const no = this.nav.no();
    const title = SLIDES[no - 1]?.title;
    const total = this.nav.total;
    return this.ui.text(title ? 'deck.announceTitle' : 'deck.announce', { no, total, title });
  });
  protected prefs = inject(PresenterPrefs);
  protected editor = inject(SideEditorState);
  protected paneStyle = computed(() => ({
    '--slidev-presenter-notes-width': `${this.prefs.paneSize().width}px`,
    '--slidev-presenter-notes-row-size': `${this.prefs.paneSize().rows}px`,
  }));
  /** The notes are a text box (dev only). Kept per tab, because a saved note rebuilds the deck and reloads the page. */
  protected editingNotes = signal(readEditing());
  protected setEditingNotes(on: boolean) {
    this.editingNotes.set(on);
    try {
      if (on) sessionStorage.setItem(scopedKey(EDITING_NOTES), '1');
      else sessionStorage.removeItem(scopedKey(EDITING_NOTES));
    } catch {
      // no storage: editing just ends with a reload
    }
  }
  // Editing ended in the box (Escape, or a click on something that takes no focus): the focus goes back to the
  // Edit Notes button instead of being lost on the page.
  protected stopEditingNotes() {
    this.setEditingNotes(false);
    afterNextRender(
      () => {
        const active = document.activeElement;
        if (!active || active === document.body)
          document.querySelector<HTMLElement>('#notes-edit')?.focus();
      },
      { injector: this.injector },
    );
  }
  private injector = inject(Injector);
  /** The main pane shows a shared screen instead of the slides. */
  protected mirror = signal(false);
  protected key = keyHandler(this.nav, this.ui);

  protected readonly title = this.ui.text('presenter.pageTitle', {
    title: String(HEADMATTER['title'] ?? 'slide.ng'),
  });

  constructor() {
    inject(Title).setTitle(this.title);
    startNavSync(this.nav);
  }

  // Shift + right click keeps the browser's own menu.
  contextMenu(e: MouseEvent) {
    if (e.shiftKey || e.defaultPrevented || !contextMenuEnabled()) return;
    e.preventDefault();
    this.ui.contextMenu.set({ x: e.pageX, y: e.pageY });
  }
}
