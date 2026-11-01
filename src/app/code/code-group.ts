// Tabs around several code blocks:  ::code-group  ```sh [npm] ... ```  ```sh [yarn] ... ```  ::
// The generator puts the blocks inside; their titles become the tabs.
import { Component, contentChildren, effect, signal } from '@angular/core';
import { CodeBlockWrapper } from './code-block-wrapper';

@Component({
  selector: 'slide-ng-code-group',
  templateUrl: './code-group.html',
  host: { class: 'slidev-code-group block' },
})
export class CodeGroup {
  protected blocks = contentChildren(CodeBlockWrapper);
  protected selected = signal(0);

  constructor() {
    // Show only the selected block (CSS hides the blocks that are not `active`).
    effect(() => this.blocks().forEach((b, i) => b.active.set(i === this.selected())));
  }
}
