import { Component, computed, inject, input } from '@angular/core';
import { SyncState } from '../sync/sync-state';
import { cleanSvg, drawingImageUrl } from './clean-svg';

// The saved drawing of a slide as a picture, for places where nobody draws: the overview and the next-step preview.
// An <img> never runs scripts, and the markup is cleaned as well (it may have come from another device).
@Component({
  selector: 'app-drawing-preview',
  host: { class: 'pointer-events-none' },
  templateUrl: './drawing-preview.html',
})
export class DrawingPreview {
  no = input.required<number>();
  private sync = inject(SyncState);
  protected url = computed(() => {
    const markup = this.sync.drawings()[this.no()];
    return markup ? drawingImageUrl(cleanSvg(markup)) : null;
  });
}
