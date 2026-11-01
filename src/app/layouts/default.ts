import { Component } from '@angular/core';

// The normal slide: padded, content from the top.
@Component({
  selector: 'sn-default',
  host: { class: 'slidev-layout default' },
  templateUrl: './default.html',
})
export class DefaultLayout {}
