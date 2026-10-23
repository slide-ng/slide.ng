import { Component, ElementRef, Injector, afterNextRender, inject, input } from '@angular/core';
import { LANGUAGE, LANGUAGES } from '../../slides/generated/languages';
import { chooseLanguage, languageName } from '../i18n/languages';
import { T } from '../i18n/t';
import { fitMenu } from '../lib/fit-menu';
import { Ui } from '../lib/ui-state';
import { IconBtn } from './icon-btn';

// The language button of the bar and its menu, for a deck with `languages` (i18n/languages.ts). Each language is named in
// its own language; the one of the page is ticked. Choosing another loads the page again at the same slide, in every
// window of this deck in this browser.
@Component({
  selector: 'app-language-menu',
  imports: [IconBtn, T],
  host: {
    class: 'flex relative',
    '(document:click)': 'closeOutside($event)',
    '(window:resize)': 'fit()',
  },
  template: `
    <button
      icon-btn
      id="nav-language"
      [title]="'nav.language' | t"
      [active]="open()"
      aria-haspopup="menu"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="open() ? 'language-menu' : null"
      (click)="toggle()"
    >
      <div class="i-carbon:translate"></div>
    </button>
    @if (open()) {
      <div
        id="language-menu"
        role="menu"
        [attr.aria-label]="'language.menu' | t"
        (keydown)="menuKey($event)"
        [class.bottom-10]="!below()"
        [class.top-10]="below()"
        class="bg-main text-main shadow-xl absolute start-0 z-menu py-2 border border-main rounded-md max-w-[calc(100vw-1rem)] overflow-y-auto"
      >
        <div
          class="text-sm op75 px-3 py-1 select-none whitespace-nowrap font-bold"
          aria-hidden="true"
        >
          {{ 'language.menu' | t }}
        </div>
        @for (l of languages; track l.lang) {
          <button
            type="button"
            role="menuitemradio"
            class="language-option flex w-full rounded whitespace-nowrap py-1 gap-1 px-2 text-sm cursor-default bg-transparent border-0 text-inherit hover:bg-gray-400/10"
            [attr.data-lang]="l.lang"
            [attr.lang]="l.lang"
            [attr.dir]="l.dir || null"
            [attr.aria-checked]="l.lang === current"
            [attr.tabindex]="l.lang === current ? 0 : -1"
            (click)="choose(l.lang)"
          >
            <div
              class="i-carbon:checkmark text-green-500 my-auto"
              [class.op0]="l.lang !== current"
            ></div>
            <div [class.op75]="l.lang !== current">{{ l.name }}</div>
          </button>
        }
      </div>
    }
  `,
})
export class LanguageMenu {
  /** The bar is at the top of the page (`navPosition`): the menu opens below the button. */
  below = input(false);
  private ui = inject(Ui);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);
  protected readonly current = LANGUAGE;
  protected readonly languages = LANGUAGES.map((l) => ({ ...l, name: languageName(l.lang) }));
  protected open = this.ui.languageMenu; // in Ui, so Escape (Ui.closeAll) closes it like the other menus

  protected toggle() {
    this.open.set(!this.open());
    if (!this.open()) return;
    this.ui.settings.set(false); // one menu at a time
    this.ui.syncMenu.set(false);
    // Into the menu, on the ticked language, whether it was opened with the mouse or the keyboard.
    afterNextRender(
      () => {
        this.fit();
        this.options()
          .find((o) => o.dataset['lang'] === this.current)
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  // Inside the window, however narrow or short it is (lib/fit-menu.ts).
  protected fit() {
    const menu = this.el.querySelector<HTMLElement>('#language-menu');
    if (menu) fitMenu(menu);
  }

  private options() {
    return [...this.el.querySelectorAll<HTMLElement>('#language-menu .language-option')];
  }

  protected choose(lang: string) {
    this.open.set(false);
    if (lang !== this.current) chooseLanguage(lang);
  }

  // Up and down (and Home, End) move between the languages, as in a menu, instead of through the slides; Enter or Space
  // chooses (the button's own click). Escape closes it and the focus goes back to the button. Tab leaves the menu closed.
  protected menuKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.open.set(false);
      this.el.querySelector<HTMLElement>('#nav-language')?.focus();
      return;
    }
    if (e.key === 'Tab') {
      this.open.set(false);
      return;
    }
    const options = this.options();
    const at = options.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === 'ArrowDown'
        ? (at + 1) % options.length
        : e.key === 'ArrowUp'
          ? (at - 1 + options.length) % options.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? options.length - 1
              : -1;
    // The other keys stay in the menu too: Enter and Space click the language, and the slides do not move meanwhile.
    e.stopPropagation();
    if (next < 0) return;
    e.preventDefault();
    options.forEach((o, i) => o.setAttribute('tabindex', i === next ? '0' : '-1'));
    options[next].focus();
  }

  // A click anywhere outside closes the menu.
  protected closeOutside(e: MouseEvent) {
    if (this.open() && !this.el.contains(e.target as Node)) this.open.set(false);
  }
}
