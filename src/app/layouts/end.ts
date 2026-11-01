import { Component } from '@angular/core';

// The last slide. Shows END when the slide has no content.
@Component({
  selector: 'sn-end',
  host: { class: 'slidev-layout end' },
  templateUrl: './end.html',
})
export class EndLayout {}
