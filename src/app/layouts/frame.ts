import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { resolveAssetUrl } from './background';

// The web page box used by the iframe layouts. `scale` shrinks or grows the page inside it.
@Component({
  selector: 'sn-frame',
  host: { class: 'block relative', '[style.width]': 'size()', '[style.height]': 'size()' },
  template:
    '<iframe class="slidev-layout-iframe" [src]="src()" [style.--slidev-iframe-scale]="scale() || null"></iframe>',
})
export class Frame {
  url = input.required<string>();
  scale = input(undefined, { transform: numberAttribute });
  size = computed(() => `${(1 / (this.scale() || 1)) * 100}%`);
  private sanitizer = inject(DomSanitizer);
  // Angular refuses plain strings in an iframe src. The address comes from the deck author, so we trust it.
  // A `public/` page (`/colophon.html`) gets the deck's base, like a picture.
  src = computed(() => this.sanitizer.bypassSecurityTrustResourceUrl(resolveAssetUrl(this.url())));
}
