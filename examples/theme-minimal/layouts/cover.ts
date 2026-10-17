import { Component, computed, input } from '@angular/core';
import { background } from 'slide-ng/layouts/background';

// Replaces the built-in `cover` layout: a left-aligned title with a thin accent line under it.
// `background` (a colour or an image) is read from the frontmatter like the built-in cover's.
@Component({
  selector: 'minimal-cover',
  host: { class: 'slidev-layout minimal-cover', '[style]': 'style()' },
  template:
    '<div class="minimal-cover-body"><ng-content /></div><div class="minimal-cover-line"></div>',
})
export class MinimalCover {
  background = input('');
  style = computed(() => background(this.background(), true)); // a colour, or an image dimmed for the title
}
