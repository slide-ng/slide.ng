import { Component, computed, input } from '@angular/core';
import { background } from './background';

// An image as the main content. `backgroundSize` can be `contain`, `20em 70%` and so on.
@Component({
  selector: 'sn-image',
  host: { class: 'slidev-layout w-full h-full', '[style]': 'style()' },
  templateUrl: './image.html',
})
export class ImageLayout {
  image = input('');
  backgroundSize = input('cover');
  style = computed(() => background(this.image(), false, this.backgroundSize()));
}
