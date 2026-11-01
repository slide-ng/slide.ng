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
import { T } from '../i18n/t';
import { Ui } from '../lib/ui-state';

/**
 * Text folded for the search: lower case by the rules of the deck's language (Turkish `İ` is `i`, `I` is `ı`), without
 * accents, and with the dotless `ı` as `i`, so "izmir", "IZMIR" and "İZMİR" all find "İzmir" and "isik" finds "Işık".
 * Arabic-Indic (٣) and Persian (۳) digits are the digits 0-9, so they find slide 3 too.
 */
export function foldForSearch(text: string, lang?: string): string {
  let lower: string;
  try {
    lower = text.toLocaleLowerCase(lang || undefined);
  } catch {
    lower = text.toLowerCase(); // not a language tag
  }
  return lower
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) => String((d.charCodeAt(0) - 0x0660) % 0x90));
}

// "Go to slide" box (key `g`, like Slidev's Goto). Type a number or part of a title,
// move with the up and down keys, Enter goes to the highlighted result, Escape closes.
@Component({
  selector: 'app-goto',
  imports: [T],
  templateUrl: './goto.html',
})
export class Goto {
  protected ui = inject(Ui);
  private nav = inject(Nav);
  private input = viewChild.required<ElementRef<HTMLInputElement>>('input');
  protected text = signal('');
  protected selected = signal(0);

  // A slide matches when its number starts with the text or its title contains it, in any case and with or without accents.
  protected results = computed(() => {
    const lang = document.documentElement.lang;
    const q = foldForSearch(this.text().trim().replace(/^\//, ''), lang);
    if (!q) return [];
    return this.nav.slides
      .map((s, i) => ({ no: i + 1, title: s.title ?? '' }))
      .filter((s) => String(s.no).startsWith(q) || foldForSearch(s.title, lang).includes(q));
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
