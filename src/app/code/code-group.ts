// Tabs around several code blocks:  ::code-group  ```sh [npm] ... ```  ```sh [yarn] ... ```  ::
// The generator puts the blocks inside; their titles become the tabs.
import { Component, contentChildren, effect, signal } from '@angular/core';
import { CodeBlockWrapper } from './code-block-wrapper';

@Component({
  selector: 'slide-ng-code-group',
  template: `
    <div class="slidev-code-group-tabs">
      @for (block of blocks(); track $index) {
        <button
          class="slidev-code-tab"
          [class.active]="$index === selected()"
          (click)="selected.set($index)"
        >
          @if (block.icon()) {
            <span class="slidev-code-title-icon w-3.5 h-3.5 relative" [class]="block.icon()"></span>
          }
          <span>{{ block.title() || 'Tab ' + ($index + 1) }}</span>
        </button>
      }
    </div>
    <div class="slidev-code-group-blocks"><ng-content /></div>
  `,
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
