import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { Draggable } from '../drawing/draggable';
import { Devices } from './devices';

// The round camera picture that floats over the slides (Slidev's WebCamera). Drag it by its edge.
@Component({
  selector: 'app-web-camera',
  imports: [Draggable],
  templateUrl: './web-camera.html',
})
export class WebCamera {
  protected devices = inject(Devices);
  private video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    // The video element appears after the stream does, so connect them whenever either changes.
    effect(() => {
      const el = this.video()?.nativeElement;
      if (el) el.srcObject = this.devices.stream();
    });
  }
}
