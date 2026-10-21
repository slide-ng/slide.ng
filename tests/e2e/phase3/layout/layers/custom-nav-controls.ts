import { Component, inject } from '@angular/core';
import { Nav } from 'slide-ng/lib/nav';
// Test layer: a button in the navigation bar that goes to the next slide.
@Component({
  selector: 'test-custom-nav-controls',
  template:
    '<button id="custom-next" class="slidev-icon-btn" title="Custom next" (click)="nav.next()"><div class="i-carbon:arrow-right"></div></button>',
})
export default class CustomNavControls {
  protected nav = inject(Nav);
}
