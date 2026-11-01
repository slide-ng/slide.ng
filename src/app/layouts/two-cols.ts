import { Component, input } from '@angular/core';

// Two columns. The left one gets the default content and `::left::`, the right one `::right::`.
// `layoutClass` goes on the whole layout, `contentClass` (the frontmatter `class`) on both columns.
@Component({
  selector: 'sn-two-cols',
  host: {
    class: 'slidev-layout two-columns w-full h-full grid grid-cols-2',
    '[class]': 'layoutClass()',
  },
  templateUrl: './two-cols.html',
})
export class TwoColsLayout {
  layoutClass = input('');
  contentClass = input('');
}
