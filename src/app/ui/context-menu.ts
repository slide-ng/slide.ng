import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Drawings } from '../drawing/drawings';
import { Fullscreen } from '../lib/fullscreen';
import { Nav } from '../lib/nav';
import { presenterEnabled } from '../lib/switches';
import { Ui } from '../lib/ui-state';
import { CONTEXT_MENU_SETUP } from '../setup/tokens';
import { T } from '../i18n/t';
import { splitAt } from '../i18n/ui-text';

// The right-click menu (Slidev's ContextMenu): four arrows, then a list of actions.

@Component({
  selector: 'app-context-menu',
  imports: [T],
  host: {
    '(document:mousedown)': 'onMouseDown($event)',
    '(document:click)': 'onClickOutside($event)',
    '(window:blur)': 'ui.contextMenu.set(null)',
  },
  template: `
    @if (ui.contextMenu(); as at) {
      <div
        #menu
        id="context-menu"
        role="menu"
        [attr.aria-label]="'menu.label' | t"
        class="slidev-glass-effect fixed z-context-menu w-60 flex flex-wrap justify-items-start p-1 rounded-md shadow overflow-hidden select-none text-main"
        [style.left.px]="left()"
        [style.top.px]="top()"
        (contextmenu)="$event.preventDefault()"
        (click)="ui.contextMenu.set(null)"
      >
        @for (a of arrows(); track a.title) {
          <button
            type="button"
            role="menuitem"
            class="menu-small p-2 w-[40px] h-[40px] text-center cursor-pointer rounded flex"
            [class]="a.disabled ? 'op40' : 'hover:bg-active'"
            [title]="a.title"
            [attr.aria-label]="a.title"
            [attr.aria-disabled]="a.disabled"
            (click)="press(a)"
          >
            <div [class]="a.icon + ' text-1.2em m-auto'"></div>
          </button>
        }
        <div class="w-full my-1 border-t border-main"></div>
        @for (item of items(); track item.label) {
          <button
            type="button"
            role="menuitem"
            class="slidev-menu-item w-full text-start"
            [class.disabled]="item.disabled"
            [attr.aria-disabled]="item.disabled"
            (click)="press(item)"
          >
            <div class="mx-auto flex"><div [class]="item.icon + ' text-1.2em m-auto'"></div></div>
            <div>{{ item.label }}</div>
          </button>
        }
        <div class="w-full my-1 border-t border-main"></div>
        <div class="w-full text-xs p-2 opacity-50">
          {{ hint[0] }}<kbd class="border px-1 py-0.5 border-main rounded text-primary">Shift</kbd
          >{{ hint[1] }}
        </div>
      </div>
    }
  `,
})
export class ContextMenu {
  protected ui = inject(Ui);
  private nav = inject(Nav);
  private fullscreen = inject(Fullscreen);
  private drawings = inject(Drawings);
  private setup = inject(CONTEXT_MENU_SETUP); // setup/context-menu.ts of the roots
  private menu = viewChild<ElementRef<HTMLElement>>('menu');
  // The key is drawn as a <kbd>, so the text is drawn in two parts around it.
  protected hint = splitAt(this.ui.text('menu.nativeHint'), 'key');

  protected arrows = computed(() => [
    {
      icon: 'i-carbon:arrow-left rtl-flip',
      title: this.ui.text('menu.prevClick'),
      run: () => this.nav.prev(),
      disabled: !this.nav.hasPrev(),
    },
    {
      icon: 'i-carbon:arrow-right rtl-flip',
      title: this.ui.text('menu.nextClick'),
      run: () => this.nav.next(),
      disabled: !this.nav.hasNext(),
    },
    {
      icon: 'i-carbon:arrow-up',
      title: this.ui.text('menu.prevSlide'),
      run: () => this.nav.prevSlide(),
      disabled: this.nav.no() <= 1,
    },
    {
      icon: 'i-carbon:arrow-down',
      title: this.ui.text('menu.nextSlide'),
      run: () => this.nav.nextSlide(),
      disabled: this.nav.no() >= this.nav.total,
    },
  ]);

  protected items = computed(() =>
    this.setup([
      ...(this.drawings.available
        ? [
            {
              icon: 'i-carbon:pen',
              label: this.ui.text(this.drawings.enabled() ? 'nav.drawingHide' : 'nav.drawingShow'),
              run: () => this.drawings.toggle(),
              disabled: false,
            },
          ]
        : []),
      {
        icon: 'i-carbon:apps',
        label: this.ui.text('nav.overview'),
        run: () => this.ui.toggleOverview(),
        disabled: false,
      },
      ...(presenterEnabled()
        ? [
            this.nav.isPresenter
              ? {
                  icon: 'i-carbon:presentation-file',
                  label: this.ui.text('menu.presenterExit'),
                  run: () => this.nav.exitPresenter(),
                  disabled: false,
                }
              : {
                  icon: 'i-carbon:user-speaker',
                  label: this.ui.text('menu.presenterEnter'),
                  run: () => this.nav.enterPresenter(),
                  disabled: false,
                },
          ]
        : []),
      {
        icon: this.fullscreen.isFullscreen() ? 'i-carbon:minimize' : 'i-carbon:maximize',
        label: this.ui.text(
          this.fullscreen.isFullscreen() ? 'nav.fullscreenExit' : 'nav.fullscreenEnter',
        ),
        run: () => this.fullscreen.toggle(),
        disabled: !this.fullscreen.available,
      },
    ]),
  );

  // A disabled entry only looks disabled to the mouse, so the keyboard is stopped here.
  protected press(entry: { run: () => void; disabled?: boolean }) {
    if (!entry.disabled) entry.run();
  }

  // Keep the menu inside the window: if it would stick out, move it back by the overflow.
  private size = signal({ width: 0, height: 0 });
  protected left = computed(() =>
    this.fit(this.ui.contextMenu()?.x ?? 0, this.size().width, window.innerWidth),
  );
  protected top = computed(() =>
    this.fit(this.ui.contextMenu()?.y ?? 0, this.size().height, window.innerHeight),
  );
  private fit = (pos: number, size: number, max: number) => (pos + size > max ? max - size : pos);

  constructor() {
    // Measure the menu once it is on screen.
    effect(() => {
      const el = this.menu()?.nativeElement;
      this.size.set({ width: el?.offsetWidth ?? 0, height: el?.offsetHeight ?? 0 });
    });
  }

  // Another right-click anywhere closes the menu (the new one opens after).
  onMouseDown(e: MouseEvent) {
    if (e.buttons & 2) this.ui.contextMenu.set(null);
  }

  onClickOutside(e: MouseEvent) {
    const menu = this.menu()?.nativeElement;
    if (menu && !menu.contains(e.target as Node)) this.ui.contextMenu.set(null);
  }
}
