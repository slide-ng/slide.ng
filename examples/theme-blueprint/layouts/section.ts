import { Component } from '@angular/core';

// Replaces `section`: the title between two dimension lines.
@Component({
  selector: 'bp-section',
  host: { class: 'slidev-layout bp-section' },
  template: '<div class="bp-dim"></div><div><ng-content /></div><div class="bp-dim"></div>',
})
export class BlueprintSection {}
