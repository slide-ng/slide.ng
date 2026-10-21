import { Injectable, signal } from '@angular/core';

/** Which pieces of interface are open. Plain signals; the components read and flip them. */
@Injectable()
export class Ui {
  readonly overview = signal(false);
  readonly goto = signal(false);
  readonly info = signal(false);
  readonly settings = signal(false);
  /** The sync mode menu of the bar. */
  readonly syncMenu = signal(false);
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

  toggleOverview() {
    this.overview.update((v) => !v);
  }
  toggleGoto() {
    this.goto.update((v) => !v);
  }

  /** Moves the overview highlight. Left/right by one card, up/down by one row. */
  moveOverview(by: 'left' | 'right' | 'up' | 'down', total: number) {
    const step = { left: -1, right: 1, up: -this.overviewColumns(), down: this.overviewColumns() }[
      by
    ];
    this.overviewPage.update((p) => Math.min(Math.max(p + step, 1), total));
  }

  /** Close everything that can be closed (Escape). */
  closeAll() {
    this.overview.set(false);
    this.goto.set(false);
    this.info.set(false);
    this.settings.set(false);
    this.syncMenu.set(false);
    this.contextMenu.set(null);
  }
}
