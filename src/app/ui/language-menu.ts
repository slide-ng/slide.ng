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
  templateUrl: './language-menu.html',
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
