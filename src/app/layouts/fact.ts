import { Component } from '@angular/core';

// One big fact or number.
@Component({
  selector: 'sn-fact',
  host: { class: 'slidev-layout fact' },
  templateUrl: './fact.html',
})
export class FactLayout {}
