import { Component, input } from '@angular/core';

// An annotation with a leader line: <bp-note label="A">text</bp-note>.
@Component({
  selector: 'bp-note',
  host: { class: 'bp-note' },
  template:
    '<span class="bp-note-label">{{ label() }}</span><span class="bp-note-text"><ng-content /></span>',
})
export class BlueprintNote {
  label = input('A');
}
