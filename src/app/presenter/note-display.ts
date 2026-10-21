import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Nav, findSlide, slideAddress } from '../lib/nav';
import { MARK, prepareNote } from './note-marks';

// The speaker notes of one slide. `html` was made while generating (markdown, with click markers).
// With `clicks` the part for the current click is highlighted and the others are dimmed.
@Component({
  selector: 'app-note-display',
  template: `
    @if (html()) {
      <div
        #note
        class="slidev-note prose dark:prose-invert overflow-auto outline-none"
        [class.slidev-note-with-clicks]="withClicks()"
        [innerHTML]="trusted()"
        (click)="follow($event)"
      ></div>
    } @else {
      <div
        class="slidev-note prose dark:prose-invert overflow-auto outline-none opacity-50 italic select-none"
      >
        <p>{{ placeholder() }}</p>
      </div>
    }
  `,
})
export class NoteDisplay {
  html = input<string | null>(null);
  placeholder = input('No notes.');
  /** The current click; leave out to show the notes without highlighting. */
  clicks = input<number | null>(null);
  autoScroll = input(false);
  /** A double click on a marker: the click number it stands for. */
  markerDblclick = output<number>();

  private note = viewChild<ElementRef<HTMLElement>>('note');
  private sanitizer = inject(DomSanitizer);
  private nav = inject(Nav, { optional: true });
  // The notes are written by the deck's author and turned into HTML while generating, like the slides themselves.
  protected trusted = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.html() ?? ''));
  protected withClicks = computed(() => this.clicks() != null && !!this.html()?.includes(MARK));
  private apply: ((current: number) => void) | null = null;

  constructor() {
    // Rebuild the marker map whenever the notes (or the element showing them) change.
    effect(() => {
      const el = this.note()?.nativeElement;
      this.html();
      untracked(() => {
        this.apply = null;
      });
      if (!el) return;
      // Wait until Angular has put the new HTML in the element.
      queueMicrotask(() => {
        this.apply = prepareNote(el, (c) => this.markerDblclick.emit(c));
        this.highlight();
      });
    });
    effect(() => {
      this.clicks();
      this.highlight();
    });
  }

  /** In the presenter, a link to a slide in the notes moves the presenter to it, instead of opening the audience page. */
  protected follow(e: MouseEvent) {
    const nav = this.nav;
    if (!nav?.isPresenter || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    const href = (e.target as Element).closest('a[href]')?.getAttribute('href');
    const to = href ? slideAddress(href) : null;
    const no =
      to &&
      findSlide(
        to,
        nav.total,
        nav.slides.map((s) => s.routeAlias),
      );
    if (!no) return;
    e.preventDefault();
    nav.go(no);
  }

  private highlight() {
    const current = this.clicks();
    if (current == null || !this.apply) return;
    this.apply(current);
    if (this.autoScroll())
      this.note()
        ?.nativeElement.querySelector(`.${MARK}-active`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
