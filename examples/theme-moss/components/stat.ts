import { Component, input } from '@angular/core';

// A number with a label: <moss-stat value="42%" label="of the forest"></moss-stat>.
@Component({
  selector: 'moss-stat',
  host: { class: 'moss-stat' },
  template:
    '<div class="moss-stat-value">{{ value() }}</div><div class="moss-stat-label">{{ label() }}</div>',
})
export class MossStat {
  value = input('');
  label = input('');
}
