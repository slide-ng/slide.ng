import { Component, input, numberAttribute } from '@angular/core';
import { Frame } from './frame';

// A web page as the main content.
@Component({
  selector: 'sn-iframe',
  imports: [Frame],
  host: { class: 'block h-full w-full' },
  templateUrl: './iframe.html',
})
export class IframeLayout {
  url = input.required<string>();
  scale = input(undefined, { transform: numberAttribute });
}
