import { Component } from '@angular/core';
import { SlideNgDrag } from './slide-ng-drag';

// `<slide-ng-drag pos="x,y,w,h">...</slide-ng-drag>`: the same as `<div slide-ng-drag="[x, y, w, h]">...</div>`.
@Component({
  selector: 'slide-ng-drag',
  hostDirectives: [{ directive: SlideNgDrag, inputs: ['slide-ng-drag: pos', 'drag-site'] }],
  host: { style: 'display: block' },
  templateUrl: './slide-ng-drag-box.html',
})
export class SlideNgDragBox {}
