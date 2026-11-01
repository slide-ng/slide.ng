import { Component, inject } from '@angular/core';
import { SLIDE_NO } from '../lib/slide-context';

// <slide-ng-current-no /> shows the number of the slide it is on.
@Component({
  selector: 'slide-ng-current-no',
  templateUrl: './slide-current-no.html',
})
export class SlideCurrentNo {
  protected no = inject(SLIDE_NO);
}
