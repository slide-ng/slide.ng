import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';

// "Go to slide" box (key `g`, like Slidev's Goto). Type a number or part of a title,
// move with the up and down keys, Enter goes to the highlighted result, Escape closes.
@Component({
  selector: 'app-goto',
  template: `
    <div
      id="slidev-goto-dialog"
      class="fixed right-5 transition-all w-90 max-w-90 min-w-90 z-modal text-main"
      [class]="ui.goto() ? 'top-5' : '-top-20 op0 pointer-events-none'"
      [attr.aria-hidden]="ui.goto() ? null : 'true'"
    >
      <div class="bg-main shadow px-4 py-2 rounded border border-transparent dark:border-gray/20">
        <input
          #input
          id="slidev-goto-input"
          type="text"
          class="outline-none bg-transparent w-full"
          placeholder="Goto..."
          aria-label="Go to slide"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="goto-results"
          [attr.aria-expanded]="ui.goto() && results().length > 0"
          [attr.aria-activedescendant]="results().length ? 'goto-result-' + selected() : null"
          [class.text-red-400]="text() && !results().length"
          [disabled]="!ui.goto()"
          [value]="text()"
          (input)="type($event)"
          (keydown.enter)="!$any($event).isComposing && go()"
          (keydown.escape)="!$any($event).isComposing && close()"
          (keydown.arrowdown)="move($event, 1)"
          (keydown.arrowup)="move($event, -1)"
        />
      </div>
      @if (ui.goto() && results().length) {
        <ul
          id="goto-results"
          role="listbox"
          aria-label="Slides"
          class="bg-main shadow mt-1 rounded border border-transparent dark:border-gray/20 overflow-auto max-h-80"
        >
          @for (r of results(); track r.no; let i = $index) {
            <li
              role="option"
              [id]="'goto-result-' + i"
              [attr.aria-selected]="i === selected()"
              class="flex gap-3 px-4 py-2 cursor-pointer hover:op100"
              [class]="i === selected() ? 'bg-active op100' : 'op80'"
              (click)="open(r.no)"
            >
              <span class="opacity-50 text-sm w-6 text-right">{{ r.no }}</span>
              <span>{{ r.title }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class Goto {
  protected ui = inject(Ui);
  private nav = inject(Nav);
  private input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected text = signal('');
  protected selected = signal(0);

  // A slide matches when its number starts with the text or its title contains it.
  protected results = computed(() => {
    const q = this.text().trim().replace(/^\//, '').toLowerCase();
    if (!q) return [];
    return this.nav.slides
      .map((s, i) => ({ no: i + 1, title: s.title ?? '' }))
      .filter((s) => String(s.no).startsWith(q) || s.title.toLowerCase().includes(q));
  });

  constructor() {
    effect(() => {
      if (this.ui.goto()) {
        untracked(() => {
          this.text.set('');
          this.selected.set(0);
        });
        // Wait a moment so the `g` that opened the box is not typed into it.
        setTimeout(() => this.input().nativeElement.focus());
      } else {
        this.input().nativeElement.blur();
      }
    });
  }

  type(e: Event) {
    this.selected.set(0);
    this.text.set((e.target as HTMLInputElement).value);
  }

  move(e: Event, by: number) {
    e.preventDefault();
    const n = this.results().length;
    if (n) this.selected.set((this.selected() + by + n) % n);
  }

  go() {
    const r = this.results()[this.selected()];
    if (r) this.open(r.no);
    else this.close();
  }

  open(no: number) {
    this.nav.go(no);
    this.close();
  }

  close() {
    this.ui.goto.set(false);
  }
}
