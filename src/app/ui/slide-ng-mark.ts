import { Component, input } from '@angular/core';

@Component({
  selector: 'app-slide-ng-mark',
  host: { class: 'inline-block', '[class.slide-ng-mark-animated]': 'animated()' },
  templateUrl: './slide-ng-mark.html',
})
export class SlideNgMark {
  animated = input(false);
}
