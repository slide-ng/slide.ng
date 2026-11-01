import { Component, computed, input } from '@angular/core';
import { background } from './background';

// Image on the right, content on the left. `contentClass` is the frontmatter `class`.
@Component({
  selector: 'sn-image-right',
  host: { class: 'grid grid-cols-2 w-full h-full auto-rows-fr' },
  templateUrl: './image-right.html',
})
export class ImageRightLayout {
  image = input('');
  contentClass = input('');
  backgroundSize = input('cover');
  style = computed(() => background(this.image(), false, this.backgroundSize()));
}
