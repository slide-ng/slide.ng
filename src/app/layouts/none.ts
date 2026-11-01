import { Component } from '@angular/core';

// No styling at all.
// Slidev wraps it in a plain div, so the element is a block here too.
@Component({
  selector: 'sn-none',
  host: { class: 'block' },
  templateUrl: './none.html',
})
export class NoneLayout {}
