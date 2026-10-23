import { Component, signal } from '@angular/core';
import { isSlideActive, onSlideEnter, onSlideLeave } from 'slide-ng/lib/slide-hooks';

// Counts entries and leaves of its slide. The counts live outside the component: the deck destroys a slide it leaves.
const counts = { enters: 0, leaves: 0, last: '' };

@Component({
  selector: 'hook-counter',
  template: `<p id="hook-counter">
    enters {{ enters() }}, leaves {{ leaves() }}, {{ active() ? 'active' : 'inactive' }}
  </p>`,
})
export class HookCounter {
  readonly active = isSlideActive();
  readonly enters = signal(counts.enters);
  readonly leaves = signal(counts.leaves);

  constructor() {
    onSlideEnter((to, from) => {
      this.enters.set(++counts.enters);
      counts.last = `${from} -> ${to}`;
      document.documentElement.dataset['hookLast'] = counts.last;
    });
    onSlideLeave((to, from) => {
      this.leaves.set(++counts.leaves);
      document.documentElement.dataset['hookLeaves'] = `${counts.leaves} (${from} -> ${to})`;
    });
  }
}
