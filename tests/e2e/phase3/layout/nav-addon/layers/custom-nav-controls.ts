import { Component } from '@angular/core';
// Test layer of a local addon: drawn in the bar before the deck's own custom-nav-controls.
@Component({
  selector: 'test-addon-nav-controls',
  template:
    '<button id="addon-nav" class="slidev-icon-btn" title="Addon button"><div class="i-carbon:star"></div></button>',
})
export default class AddonNavControls {}
