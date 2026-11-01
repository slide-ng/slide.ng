import { Component, ElementRef, effect, signal, viewChild } from '@angular/core';
import { T } from '../i18n/t';

// Shows a shared screen or window in the presenter's main pane (Slidev's ScreenCaptureMirror),
// for example the demo you are running next to the slides.
@Component({
  selector: 'app-screen-mirror',
  imports: [T],
  templateUrl: './screen-mirror.html',
})
export class ScreenMirror {
  protected stream = signal<MediaStream | null>(null);
  protected error = signal('');
  private video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    effect(() => {
      const el = this.video()?.nativeElement;
      if (el) el.srcObject = this.stream();
    });
  }

  async start() {
    this.error.set('');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stop());
      this.stream.set(stream);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'screen sharing failed');
    }
  }

  stop() {
    this.stream()
      ?.getTracks()
      .forEach((t) => t.stop());
    this.stream.set(null);
  }
}
