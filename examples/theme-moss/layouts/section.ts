import { Component } from '@angular/core';

// Replaces `section`: a moss bar at the left and the title beside it.
@Component({
  selector: 'moss-section',
  host: { class: 'slidev-layout moss-section' },
  template: '<div class="moss-section-bar"></div><div><ng-content /></div>',
})
export class MossSection {}
