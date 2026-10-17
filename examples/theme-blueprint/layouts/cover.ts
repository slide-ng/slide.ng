import { Component, computed, input } from '@angular/core';
import { background } from 'slide-ng/layouts/background';

// Replaces `cover`: a title block with corner marks and a drawing-sheet label, like a plan's title box.
@Component({
  selector: 'bp-cover',
  host: { class: 'slidev-layout bp-cover', '[style]': 'style()' },
  template: `<div class="bp-frame">
    <i class="bp-corner tl"></i><i class="bp-corner tr"></i><i class="bp-corner bl"></i
    ><i class="bp-corner br"></i>
    <div class="bp-cover-body"><ng-content /></div>
    <div class="bp-sheet">{{ sheet() }}</div>
  </div>`,
})
export class BlueprintCover {
  background = input('');
  sheet = input('SHEET 01');
  style = computed(() => background(this.background(), true)); // a colour, or an image dimmed for the title
}
