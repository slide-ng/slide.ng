// A <video> that can play by itself when the slide (and its click) comes:
//   <slide-ng-video slide-ng-click autoplay="true" controls><source src="/clip.mp4" type="video/mp4" /></slide-ng-video>
// `autoplay`: "true" plays every time it appears, "once" only the first time. `autoreset`: "slide" or "click"
// goes back to the `timestamp` when it disappears. Where it does not play (print, export, overview), `printPoster` replaces
// `poster` and the frame at `printTimestamp` (seconds, or `last`) is shown. Called `slide-ng-video` (Slidev: SlidevVideo) to stay clear of <video>.
import {
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  numberAttribute,
  viewChild,
} from '@angular/core';
import { Nav } from '../lib/nav';
import { RENDER_CONTEXT, SLIDE_NO } from '../lib/slide-context';
import { SlideNgClick } from '../lib/slide-ng-click';

@Component({
  selector: 'slide-ng-video',
  template: `
    <video
      #video
      [attr.poster]="canPlay ? poster() : (printPoster() ?? poster())"
      [controls]="controls() && canPlay"
      (play)="played = true"
      (loadedmetadata)="onLoadedMetadata()"
    >
      <ng-content />
    </video>
  `,
  host: { style: 'display: inline-block' },
  // A class or size on the element (Slidev's `<SlidevVideo class="h-60">`) sizes the video: it fits inside, keeping its shape.
  styles: 'video { display: block; max-width: 100%; max-height: 100%; margin: auto }',
})
export class SlideVideo {
  autoplay = input<boolean | 'once', unknown>(false, {
    transform: (v) => (v === 'once' ? 'once' : booleanAttribute(v)),
  });
  autoreset = input<'slide' | 'click'>();
  poster = input<string>();
  timestamp = input(0, { transform: numberAttribute });
  printPoster = input<string>();
  printTimestamp = input<number | 'last' | undefined, unknown>(undefined, {
    transform: (v) =>
      v === 'last' ? 'last' : v == null || v === '' ? undefined : numberAttribute(v),
  });
  controls = input(false, { transform: booleanAttribute });

  protected played = false;
  private started = false;
  private video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private nav = inject(Nav);
  private slideNo = inject(SLIDE_NO);
  // `slide-ng-click` on this element: the video is shown only from its click on.
  private click = inject(SlideNgClick, { self: true, optional: true });
  // Thumbnails and the like do not play anything.
  protected canPlay = ['slide', 'presenter'].includes(inject(RENDER_CONTEXT));
  private onSlide = computed(() => this.nav.no() === this.slideNo);
  private shown = computed(() => this.onSlide() && !(this.click?.state.hidden() ?? false));

  // Port of Slidev's onLoadedMetadata: without a print poster (or with a print timestamp) show that frame instead.
  protected onLoadedMetadata() {
    if (this.canPlay) return;
    const at = this.printTimestamp();
    if (this.printPoster() && at === undefined) return;
    const video = this.video().nativeElement;
    const time = at ?? this.timestamp();
    video.currentTime = time === 'last' ? video.duration : time;
  }

  constructor() {
    effect(() => {
      if (!this.canPlay) return;
      const video = this.video().nativeElement;
      // `timestamp` is where playing starts, not only where a reset goes (before loading, this sets the start position).
      if (!this.started) {
        this.started = true;
        video.currentTime = this.timestamp();
      }
      const shown = this.shown();
      const autoplay = this.autoplay();
      if (shown) {
        if (autoplay === true || (autoplay === 'once' && !this.played))
          void video.play().catch(() => undefined);
      } else {
        video.pause();
        const reset = this.autoreset();
        if (reset === 'click' || (reset === 'slide' && !this.onSlide()))
          video.currentTime = this.timestamp();
      }
    });
  }
}
