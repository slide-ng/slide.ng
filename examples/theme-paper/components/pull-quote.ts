import { Component, input } from '@angular/core';

// A pull quote set in the serif: <paper-pull by="Ada Lovelace">text</paper-pull>.
@Component({
  selector: 'paper-pull',
  host: { class: 'paper-pull' },
  template:
    '<div class="paper-pull-text"><ng-content /></div><div class="paper-pull-by">{{ by() }}</div>',
})
export class PaperPull {
  by = input('');
}
