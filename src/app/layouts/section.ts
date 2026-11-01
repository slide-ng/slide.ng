import { Component } from '@angular/core';

// Marks the start of a new section.
@Component({
  selector: 'sn-section',
  host: { class: 'slidev-layout section w-full h-full grid' },
  templateUrl: './section.html',
})
export class SectionLayout {}
