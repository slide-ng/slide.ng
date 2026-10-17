import { Component, input } from '@angular/core';

// Replaces `section`: a large chapter number in the accent colour above the title.
@Component({
  selector: 'paper-section',
  host: { class: 'slidev-layout paper-section' },
  template: '<div class="paper-section-no">{{ no() }}</div><div><ng-content /></div>',
})
export class PaperSection {
  no = input('§');
}
