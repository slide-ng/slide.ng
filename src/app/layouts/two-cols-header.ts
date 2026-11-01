import { Component, input } from '@angular/core';

// A header across the top (default content), then left and right columns, then a bottom row.
// The grid itself is in layouts.css (.two-cols-header).
@Component({
  selector: 'sn-two-cols-header',
  host: { class: 'slidev-layout two-cols-header w-full h-full', '[class]': 'layoutClass()' },
  templateUrl: './two-cols-header.html',
})
export class TwoColsHeaderLayout {
  layoutClass = input('');
  contentClass = input('');
}
