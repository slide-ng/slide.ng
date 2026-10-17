import { InjectionToken, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { Arrow, Box } from './drag-math';

interface Common {
  slideNo: number;
  /** The element on the slide. The controls need its real height when a box has an automatic one. */
  el: HTMLElement;
  /** Called when a move, resize or nudge is finished: remembers the new place. */
  commit(): void;
}
/** One thing the user can drag: a box (`slide-ng-drag`) or an arrow (`<slide-ng-drag-arrow>`). */
export type DragTarget =
  | (Common & { kind: 'box'; value: WritableSignal<Box> })
  | (Common & { kind: 'arrow'; value: WritableSignal<Arrow> });

/** What gets sent when a drag ends. `pos` is always the plain spelling, `10,20,30,_[,rotation]` or `x1,y1,x2,y2`. */
export interface DragSave {
  slide: number;
  site: number;
  pos: string;
}

/** Something that can write the position into slides.md. Only the dev server provides one (see dev/dev-api.ts). */
export const DRAG_SAVER = new InjectionToken<(save: DragSave) => void>('DRAG_SAVER');

/** The element being dragged or edited now (Slidev: `activeDragElement`), and the places moved during this visit. */
@Injectable({ providedIn: 'root' })
export class DragState {
  readonly active = signal<DragTarget | null>(null);
  private saver = inject(DRAG_SAVER, { optional: true });
  /** Positions chosen in this session, `slide:site` -> text. They win over the slide's own value, so a built deck keeps a move while you stay on the page. */
  private moved = new Map<string, string>();

  savedPos(slide: number, site: string | null): string | undefined {
    return site == null ? undefined : this.moved.get(`${slide}:${site}`);
  }

  save(slide: number, site: string | null, pos: string) {
    if (site == null) return; // no site number: this element was not tagged by the generator
    this.moved.set(`${slide}:${site}`, pos);
    this.saver?.({ slide, site: +site, pos });
  }
}

/** The `zoom` of the slide an element is in (`--slidev-zoom` on the slide's host, 1 without one). Slide pixels are scaled by it. */
export const zoomOf = (el: Element): number =>
  Number(getComputedStyle(el).getPropertyValue('--slidev-zoom')) || 1;
