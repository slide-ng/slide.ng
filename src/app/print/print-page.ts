import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, computed, inject, viewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SLIDES } from '../../slides/generated';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/canvas';
import { Dark } from '../lib/dark';
import { Nav } from '../lib/nav';
import { parseRange } from '../lib/range';
import { Ui } from '../lib/ui-state';
import { PrintSlide } from './print-slide';
import { initialDrawings } from '../drawing/persistence';
import { SyncState } from '../sync/sync-state';

// The route /print: every slide, one after the other at full size, for a PDF or for screenshots.
//   ?print=clicks   one page for every click step    ?range=1,3-5   only these slides
// `data-slide-ng-print` turns to `ready` when every page is drawn; the exporter waits for it.
// Nav and Ui are provided because a few built-in components (the table of contents) read them.
@Component({
  selector: 'app-print-page',
  imports: [PrintSlide],
  providers: [Nav, Ui],
  template: `
    <div id="print-content" [attr.data-slide-ng-print]="ready() ? 'ready' : 'loading'">
      @for (no of pages; track no) {
        <app-print-slide [no]="no" [withClicks]="withClicks" />
      }
    </div>
  `,
})
export class PrintPage {
  private query = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly withClicks = this.query.get('print') === 'clicks';
  readonly pages = parseRange(SLIDES.length, this.query.get('range'));
  private slides = viewChildren(PrintSlide);
  protected ready = computed(
    () => this.slides().length === this.pages.length && this.slides().every((s) => s.ready()),
  );

  constructor() {
    inject(Dark); // applies the light or dark class to <html>
    // The deck's drawings (persisted ones and this browser's) are drawn on paper too; the deck page loads them itself.
    inject(SyncState).drawings.update((d) => ({ ...initialDrawings(), ...d }));
    const doc = inject(DOCUMENT);
    doc.documentElement.classList.add('print');
    // The paper is the size of one slide, with no margin.
    const style = doc.createElement('style');
    style.textContent = `@page { size: ${CANVAS_WIDTH}px ${CANVAS_HEIGHT}px; margin: 0; }`;
    doc.head.append(style);
    inject(DestroyRef).onDestroy(() => {
      doc.documentElement.classList.remove('print');
      style.remove();
    });
  }
}
