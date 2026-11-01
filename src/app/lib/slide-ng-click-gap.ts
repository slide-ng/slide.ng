import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { ClicksContext } from './clicks';

// <slide-ng-click-gap size="2" /> leaves `size` clicks empty (port of Slidev's SlideNgClickGap).
@Component({
  selector: 'slide-ng-click-gap',
  templateUrl: './slide-ng-click-gap.html',
})
export class SlideNgClickGap implements OnInit, OnDestroy {
  size = input<string | number>(1);
  private ctx = inject(ClicksContext);

  ngOnInit() {
    let delta = +this.size();
    if (Number.isNaN(delta)) {
      console.warn(`[clicks] invalid size for slide-ng-click-gap: ${this.size()}`);
      delta = 1;
    }
    this.ctx.register(this, { delta, max: this.ctx.currentOffset + delta - 1 });
  }

  ngOnDestroy() {
    this.ctx.unregister(this);
  }
}
