// A math block whose rows can be highlighted one click at a time:  $$ {1|3|all}
// Port of Slidev's KaTexBlockWrapper. The formula itself was drawn by KaTeX while generating.
import { Component, ElementRef, afterRenderEffect, inject } from '@angular/core';
import { RangedBlock } from './ranged-block';
import { parseRange } from './ranges';

// KaTeX draws a multi-row formula as a table of columns; a "row" is the same-numbered cell in each column.
const COLUMNS = '.mtable > [class*=col-align]';
const CELLS = ':scope > .vlist-t > .vlist-r > .vlist > span > .mord';

export function collectRows(root: Element): Element[][] {
  const columns = Array.from(root.querySelectorAll(COLUMNS)).filter(
    (c) => !c.parentElement?.closest(COLUMNS),
  );
  const rows: Element[][] = [];
  for (const column of columns) {
    column.querySelectorAll(CELLS).forEach((cell, i) => (rows[i] ??= []).push(cell));
  }
  return rows;
}

@Component({
  selector: 'slide-ng-katex-block-wrapper',
  templateUrl: './katex-block.html',
  host: { class: 'slidev-katex-wrapper block' },
})
export class KatexBlockWrapper extends RangedBlock {
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    super();
    afterRenderEffect(() => {
      if (!this.ranges().length) return;
      const { text, hide } = this.shown();
      this.host.classList.toggle('slidev-vclick-hidden', hide);
      const rows = collectRows(this.host);
      const wanted = parseRange(rows.length + this.startLine() - 1, text);
      rows.forEach((cells, i) => {
        const on = wanted.includes(i + this.startLine());
        for (const cell of cells) {
          cell.classList.add('slidev-vclick-target');
          cell.classList.toggle('highlighted', on);
          cell.classList.toggle('dishonored', !on);
        }
      });
    });
  }
}
