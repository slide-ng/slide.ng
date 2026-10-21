import { Injectable, computed } from '@angular/core';
import { storedSignal } from '../lib/stored-signal';
import { PaneSize, PaneSizes, paneSizeOf } from './pane-sizes';

// What the presenter changes about its own page, remembered in the browser (Slidev's keys).
@Injectable({ providedIn: 'root' })
export class PresenterPrefs {
  /** 1, 2 or 3: the three arrangements of current slide, notes and next step. */
  readonly layout = storedSignal('slidev-presenter-layout', 1);
  /** Font size of the notes, in em. */
  readonly fontSize = storedSignal('slidev-presenter-font-size', 1);
  /** The audience sees the presenter's mouse over the slide. */
  readonly showCursor = storedSignal('slidev-presenter-cursor', true);
  /** How the audience sees it: a mouse arrow or a red laser dot. */
  readonly cursorStyle = storedSignal<'cursor' | 'laser'>('slidev-cursor-style', 'cursor');
  /** The notes pane's width and row size, dragged on the borders; one pair per layout. */
  private readonly paneSizes = storedSignal<PaneSizes>('slide-ng-presenter-pane-sizes', {});
  readonly paneSize = computed(() => paneSizeOf(this.paneSizes(), this.layout()));

  setPaneSize(change: Partial<PaneSize>) {
    const layout = this.layout();
    this.paneSizes.update((all) => ({
      ...all,
      [layout]: { ...paneSizeOf(all, layout), ...change },
    }));
  }
  /** The current slide also shows what the next clicks show, greyed out (slide.ng's own, so not a Slidev key). */
  readonly clickPreview = storedSignal('slide-ng-presenter-click-preview', false);

  nextLayout() {
    this.layout.update((l) => (l >= 3 ? 1 : l + 1));
  }
  bigger() {
    this.fontSize.update((s) => Math.min(2, Math.round((s + 0.1) * 10) / 10));
  }
  smaller() {
    this.fontSize.update((s) => Math.max(0.5, Math.round((s - 0.1) * 10) / 10));
  }
  toggleCursor() {
    this.showCursor.update((v) => !v);
  }
  toggleClickPreview() {
    this.clickPreview.update((v) => !v);
  }
}
