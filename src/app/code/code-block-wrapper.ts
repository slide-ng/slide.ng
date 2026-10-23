// Wraps one highlighted code block (the generator puts Shiki's <pre> inside).
// Port of Slidev's CodeBlockWrapper: title bar, copy button, line numbers, maximum height and
// the line highlights, which can change with clicks: ```ts {2-3|5|all}
import {
  Component,
  ElementRef,
  afterRenderEffect,
  booleanAttribute,
  inject,
  input,
  signal,
} from '@angular/core';
import { T } from '../i18n/t';
import { copyText } from './copy';
import { RangedBlock } from './ranged-block';
import { highlightLines } from './ranges';

@Component({
  selector: 'slide-ng-code-block-wrapper',
  imports: [T],
  host: {
    class: 'slidev-code-wrapper relative group',
    '[class.slidev-code-line-numbers]': 'lines()',
    '[class.active]': 'active()',
    '[style.max-height]': 'maxHeight()',
    '[style.overflow-y]': 'maxHeight() ? "scroll" : null',
    '[style.--start]': 'startLine()',
    '[attr.data-title]': 'title()',
  },
  template: `
    @if (title() || icon()) {
      <div class="slidev-code-block-title">
        @if (icon()) {
          <span class="slidev-code-title-icon w-3.5 h-3.5 relative" [class]="icon()"></span>
        }
        <div class="leading-1em">{{ title() }}</div>
      </div>
    }
    <ng-content />
    @if (!noCopy()) {
      <button
        class="slidev-code-copy absolute right-0 transition opacity-0 group-hover:opacity-20 hover:!opacity-100"
        [class]="title() || icon() ? 'top-10' : 'top-0'"
        [attr.title]="(copied() ? 'code.copied' : 'code.copy') | t"
        (click)="copy()"
      >
        <span
          [class]="copied() ? 'i-ph:check-circle' : 'i-ph:clipboard'"
          class="inline-block p-2 w-8 h-8"
        ></span>
      </button>
    }
  `,
})
export class CodeBlockWrapper extends RangedBlock {
  lines = input(false, { transform: booleanAttribute });
  maxHeight = input<string>();
  title = input('');
  /** the icon class in front of the title (the generator picks it, see scripts/lib/code/title-icon.mjs) */
  icon = input('');
  noCopy = input(false, { transform: booleanAttribute });
  /** set by a code group: the tab that is shown */
  active = signal(false);

  protected copied = signal(false);
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    super();
    afterRenderEffect(() => {
      if (!this.ranges().length) return;
      const { text, hide } = this.shown();
      this.host.classList.toggle('slidev-vclick-hidden', hide);
      const lines = Array.from(this.host.querySelectorAll('.shiki code > .line')).map((el) => [el]);
      highlightLines(lines, text, this.startLine());
      if (this.maxHeight()) this.scrollToHighlight();
    });
  }

  // With a maximum height the block scrolls; keep the highlighted lines in view. Only the block scrolls:
  // scrollIntoView would also scroll every container around it (the overview, the page).
  private scrollToHighlight() {
    const lit = Array.from(this.host.querySelectorAll<HTMLElement>('.line.highlighted'));
    const box = this.host; // the wrapper is what scrolls (max-height, overflow-y)
    if (!lit.length) return;
    const height = lit.reduce((sum, el) => sum + el.offsetHeight, 0);
    const all = lit.length === this.host.querySelectorAll('.shiki code > .line').length;
    if (all) return box.scrollTo({ top: 0, behavior: 'smooth' }); // `{*}`: nothing to look for, start at the top
    const tall = height > box.clientHeight;
    const target = tall ? lit[0] : lit[Math.round((lit.length - 1) / 2)];
    // Rectangles are in screen pixels, the slide is scaled; scrollTop is in the block's own pixels.
    const scale = box.getBoundingClientRect().height / box.offsetHeight || 1;
    const offset = (target.getBoundingClientRect().top - box.getBoundingClientRect().top) / scale;
    const top = box.scrollTop + offset - (tall ? 0 : (box.clientHeight - target.offsetHeight) / 2);
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  protected async copy() {
    const text = this.host.querySelector('.slidev-code')?.textContent;
    if (!text || !(await copyText(text))) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
