import { Injectable, inject, signal } from '@angular/core';
import { UiTextKey } from '../i18n/en';
import { UI_TEXT, UiTextParams, uiText } from '../i18n/ui-text';
import { NavPositionName } from './nav-position';

/** Which pieces of interface are open. Plain signals; the components read and flip them. */
@Injectable()
export class Ui {
  readonly overview = signal(false);
  readonly goto = signal(false);
  readonly info = signal(false);
  readonly settings = signal(false);
  /** The sync mode menu of the bar. */
  readonly syncMenu = signal(false);
  /** The language menu of the bar (a deck with `languages`). */
  readonly languageMenu = signal(false);
  readonly barPeek = signal(false);
  private barPeekTimer?: ReturnType<typeof setTimeout>;
  readonly barDrag = signal<{ dx: number; dy: number; over: NavPositionName | null } | null>(null);
  /** The right-click menu: where it opened, or null when closed. */
  readonly contextMenu = signal<{ x: number; y: number } | null>(null);
  /** Slide scale: 0 = fit the window, 1 = real size (1:1). */
  readonly slideScale = signal(0);
  readonly hideIdleCursor = signal(false);
  /** The scale the main slide is drawn at now (Slidev's `$scale`); the drawing layer and drag handles need it. */
  readonly canvasScale = signal(1);
  /** Overview: the highlighted slide (1-based) and how many cards fit in a row (for up/down). */
  readonly overviewPage = signal(1);
  readonly overviewColumns = signal(1);
  private dictionary = inject(UI_TEXT);

  /** A text of the interface in the deck's language, for TypeScript (templates use the `t` pipe). */
  text(key: UiTextKey, params?: UiTextParams): string {
    return uiText(this.dictionary, key, params);
  }

  peekBar(ms = 3000) {
    clearTimeout(this.barPeekTimer);
    this.barPeek.set(true);
    this.barPeekTimer = setTimeout(() => this.barPeek.set(false), ms);
  }

  toggleOverview() {
    this.overview.update((v) => !v);
  }
  toggleGoto() {
    this.goto.update((v) => !v);
  }

  /**
   * Moves the overview highlight. Left/right by one card, up/down by one row. The keys follow the cards on the screen:
   * in a right-to-left page the grid is mirrored, so the next card is on the left.
   */
  moveOverview(
    by: 'left' | 'right' | 'up' | 'down',
    total: number,
    rtl = getComputedStyle(document.documentElement).direction === 'rtl',
  ) {
    const forward = rtl ? -1 : 1;
    const step = {
      left: -forward,
      right: forward,
      up: -this.overviewColumns(),
      down: this.overviewColumns(),
    }[by];
    this.overviewPage.update((p) => Math.min(Math.max(p + step, 1), total));
  }

  /** Close everything that can be closed (Escape). */
  closeAll() {
    this.overview.set(false);
    this.goto.set(false);
    this.info.set(false);
    this.settings.set(false);
    this.syncMenu.set(false);
    this.languageMenu.set(false);
    this.contextMenu.set(null);
  }
}
