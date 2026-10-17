import { Component, computed, input } from '@angular/core';
import { background } from 'slide-ng/layouts/background';

// Replaces `cover`: a journal masthead, a rule above and below the title, and an optional issue line.
@Component({
  selector: 'paper-cover',
  host: { class: 'slidev-layout paper-cover', '[style]': 'style()' },
  template: `<div class="paper-masthead">
      <span>{{ issue() }}</span
      ><span>{{ date() }}</span>
    </div>
    <div class="paper-cover-body"><ng-content /></div>
    <div class="paper-rule"></div>`,
})
export class PaperCover {
  background = input('');
  issue = input('No. 01');
  date = input('');
  style = computed(() => background(this.background(), true)); // a colour, or an image dimmed for the title
}
