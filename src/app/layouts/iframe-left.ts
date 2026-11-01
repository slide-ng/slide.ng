import { Component, input, numberAttribute } from '@angular/core';
import { Frame } from './frame';

// Web page on the left, content on the right. `contentClass` is the frontmatter `class`.
@Component({
  selector: 'sn-iframe-left',
  imports: [Frame],
  host: { class: 'grid grid-cols-2 w-full h-full' },
  templateUrl: './iframe-left.html',
})
export class IframeLeftLayout {
  url = input.required<string>();
  scale = input(undefined, { transform: numberAttribute });
  contentClass = input('');
}
