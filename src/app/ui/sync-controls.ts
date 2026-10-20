import { Component, ElementRef, Injector, afterNextRender, computed, inject } from '@angular/core';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { SyncState } from '../sync/sync-state';
import { SYNC_MODES, SyncMode, syncFlags, syncMode, withSyncMode } from '../sync/sync-mode';
import { IconBtn } from './icon-btn';
import { T } from '../i18n/t';

// The sync button of the bar and its menu (Slidev's SyncControls): which way this window's navigation travels.
// The choice is kept per role (viewer or presenter) and applies to every window of that role in this browser.
@Component({
  selector: 'app-sync-controls',
  imports: [IconBtn, T],
  host: { class: 'flex relative', '(document:click)': 'closeOutside($event)' },
  template: `
    <button
      icon-btn
      id="nav-sync"
      [title]="'nav.sync' | t"
      [active]="open()"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <div
        class="i-ph:arrow-up-bold mx--1.2 scale-x-80"
        [class]="flags().send ? 'text-green6 dark:text-green' : 'op30'"
      ></div>
      <div
        class="i-ph:arrow-down-bold mx--1.2 scale-x-80"
        [class]="flags().receive ? 'text-green6 dark:text-green' : 'op30'"
      ></div>
    </button>
    @if (open()) {
      <div
        id="sync-menu"
        (keydown)="menuKey($event)"
        class="bg-main text-main shadow-xl absolute bottom-10 left-0 z-menu py-2 border border-main rounded-md"
      >
        <div class="text-sm flex flex-col gap-2">
          <div class="px-3 whitespace-nowrap">
            <span class="op75">{{ 'sync.for' | t }} </span>
            <span class="font-bold text-primary">{{ role | t }}</span>
          </div>
          <div class="h-1px opacity-10 bg-current w-full"></div>
          <div role="radiogroup" aria-labelledby="sync-mode-title">
            <div
              id="sync-mode-title"
              class="text-sm op75 px-3 py-1 select-none whitespace-nowrap font-bold"
            >
              {{ 'sync.mode' | t }}
            </div>
            @for (m of modes; track m.value) {
              <button
                type="button"
                role="radio"
                class="sync-mode flex w-full rounded whitespace-nowrap py-1 gap-1 px-2 cursor-default bg-transparent border-0 text-inherit hover:bg-gray-400/10"
                [attr.data-mode]="m.value"
                [attr.aria-checked]="mode() === m.value"
                [attr.tabindex]="mode() === m.value ? 0 : -1"
                (click)="choose(m.value)"
              >
                <div
                  class="i-carbon:checkmark text-green-500 my-auto"
                  [class.op0]="mode() !== m.value"
                ></div>
                <div [class.op50]="mode() !== m.value">{{ m.label | t }}</div>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class SyncControls {
  private sync = inject(SyncState);
  private ui = inject(Ui);
  private isPresenter = inject(Nav).isPresenter;
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);
  protected readonly modes = SYNC_MODES;
  protected readonly role = this.isPresenter ? 'sync.presenter' : 'sync.viewer';
  protected open = this.ui.syncMenu; // in Ui, so Escape (Ui.closeAll) closes it like the settings menu
  protected flags = computed(() => syncFlags(this.sync.directions(), this.isPresenter));
  protected mode = computed(() => syncMode(this.sync.directions(), this.isPresenter));

  protected toggle() {
    this.open.set(!this.open());
    if (!this.open()) return;
    this.ui.settings.set(false); // one menu at a time
    // Into the menu, on the ticked mode (as a radio group): the arrow keys then change the mode, not the slide,
    // whether the menu was opened with the mouse or the keyboard.
    afterNextRender(() => this.focusMode(this.mode()), { injector: this.injector });
  }

  private focusMode(mode: SyncMode) {
    this.el.querySelector<HTMLElement>(`#sync-menu [data-mode="${mode}"]`)?.focus();
  }

  protected choose(mode: SyncMode) {
    this.sync.directions.update((d) => withSyncMode(d, this.isPresenter, mode));
  }

  // The arrow keys inside the menu move between the modes (as in a radio group) instead of through the slides.
  // Escape closes it (as everywhere) and the focus goes back to the button, not to the page.
  protected menuKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.open.set(false);
      this.el.querySelector<HTMLElement>('#nav-sync')?.focus();
      return;
    }
    const by = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!by) return;
    e.preventDefault();
    e.stopPropagation();
    const i = this.modes.findIndex((m) => m.value === this.mode());
    const next = this.modes[(i + by + this.modes.length) % this.modes.length].value;
    this.choose(next);
    this.focusMode(next);
  }

  // A click anywhere outside closes the menu (Slidev's onClickOutside).
  protected closeOutside(e: MouseEvent) {
    if (this.open() && !this.el.contains(e.target as Node)) this.open.set(false);
  }
}
