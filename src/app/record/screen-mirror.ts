import { Component, ElementRef, effect, signal, viewChild } from '@angular/core';
import { T } from '../i18n/t';

// Shows a shared screen or window in the presenter's main pane (Slidev's ScreenCaptureMirror),
// for example the demo you are running next to the slides.
@Component({
  selector: 'app-screen-mirror',
  imports: [T],
  template: `
    <div class="h-full w-full flex items-center justify-center bg-black/80 rounded">
      @if (stream()) {
        <video #video autoplay muted playsinline class="max-h-full max-w-full"></video>
        <button
          id="mirror-stop"
          class="absolute top-2 right-2 px-2 py-1 rounded bg-main border border-main text-sm"
          (click)="stop()"
        >
          {{ 'presenter.mirrorStop' | t }}
        </button>
      } @else {
        <button
          id="mirror-start"
          class="px-3 py-1.5 rounded bg-main border border-main text-sm"
          (click)="start()"
        >
          {{ 'presenter.mirrorStart' | t }}
        </button>
        @if (error()) {
          <div id="mirror-error" class="absolute bottom-2 text-xs color-red-400">{{ error() }}</div>
        }
      }
    </div>
  `,
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
