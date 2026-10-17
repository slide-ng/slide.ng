import { Component, computed, input } from '@angular/core';

// Replaces `cover`: the title sits low on the left, over a soft forest-floor light.
@Component({
  selector: 'moss-cover',
  host: { class: 'slidev-layout moss-cover', '[style]': 'style()' },
  template: '<div class="moss-cover-body"><ng-content /></div>',
})
export class MossCover {
  background = input('');
  style = computed(() => (this.background() ? `background:${this.background()}` : ''));
}
