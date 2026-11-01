import { Component } from '@angular/core';

// Content in the middle of the screen. Add `class: text-center` to centre the text as well.
@Component({
  selector: 'sn-center',
  host: { class: 'slidev-layout center h-full grid place-content-center' },
  templateUrl: './center.html',
})
export class CenterLayout {}
