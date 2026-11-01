import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Nav } from '../lib/nav';
import { SLIDE_NO } from '../lib/slide-context';

// <slide-ng-title-renderer no="42" /> draws that slide's title as HTML, with its inline markdown and $math$.
// Without `no`, it draws the title of the slide it is on. (Slidev's <TitleRenderer />.)
@Component({
  selector: 'slide-ng-title-renderer',
  templateUrl: './slide-title-renderer.html',
})
export class SlideTitleRenderer {
  no = input<string | number | undefined>(undefined);
  private nav = inject(Nav);
  private here = inject(SLIDE_NO);
  // The generator rendered the title from the deck's own source; the sanitizer would strip KaTeX's styles.
  private sanitizer = inject(DomSanitizer);
  protected html = computed<SafeHtml>(() => {
    const raw = this.no();
    const n = raw == null || raw === '' ? this.here : +raw;
    const meta = this.nav.slides[n - 1];
    return this.sanitizer.bypassSecurityTrustHtml(meta?.titleHtml ?? '');
  });
}
