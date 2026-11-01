import { Component } from '@angular/core';

// A quotation with prominence.
@Component({
  selector: 'sn-quote',
  host: { class: 'slidev-layout quote' },
  templateUrl: './quote.html',
})
export class QuoteLayout {}
