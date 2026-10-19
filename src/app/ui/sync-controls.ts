import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { SyncState } from '../sync/sync-state';
import { SYNC_MODES, SyncMode, syncFlags, syncMode, withSyncMode } from '../sync/sync-mode';
import { IconBtn } from './icon-btn';

// The sync button of the bar and its menu (Slidev's SyncControls): which way this window's navigation travels.
// The choice is kept per role (viewer or presenter) and applies to every window of that role in this browser.
@Component({
  selector: 'app-sync-controls',
  imports: [IconBtn],
  host: { class: 'flex relative', '(document:click)': 'closeOutside($event)' },
  template: `
    <button
      icon-btn
      id="nav-sync"
      title="Change sync settings"
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
        class="bg-main text-main shadow-xl absolute bottom-10 left-0 z-menu py-2 border border-main rounded-md"
      >
        <div class="text-sm flex flex-col gap-2">
          <div class="px-3 whitespace-nowrap">
            <span class="op75">Slides navigation syncing for </span>
            <span class="font-bold text-primary">{{ role }}</span>
          </div>
          <div class="h-1px opacity-10 bg-current w-full"></div>
          <div role="radiogroup" aria-labelledby="sync-mode-title">
            <div
              id="sync-mode-title"
              class="text-sm op75 px-3 py-1 select-none whitespace-nowrap font-bold"
            >
              Sync Mode
            </div>
            @for (m of modes; track m.value) {
              <button
                type="button"
                role="radio"
                class="sync-mode flex w-full rounded whitespace-nowrap py-1 gap-1 px-2 cursor-default bg-transparent border-0 text-inherit hover:bg-gray-400/10"
                [attr.data-mode]="m.value"
                [attr.aria-checked]="mode() === m.value"
                (click)="choose(m.value)"
              >
                <div
                  class="i-carbon:checkmark text-green-500 my-auto"
                  [class.op0]="mode() !== m.value"
                ></div>
                <div [class.op50]="mode() !== m.value">{{ m.label }}</div>
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
  protected readonly modes = SYNC_MODES;
  protected readonly role = this.isPresenter ? 'presenter' : 'viewer';
  protected open = signal(false);
  protected flags = computed(() => syncFlags(this.sync.directions(), this.isPresenter));
  protected mode = computed(() => syncMode(this.sync.directions(), this.isPresenter));

  protected toggle() {
    this.open.set(!this.open());
    if (this.open()) this.ui.settings.set(false); // one menu at a time
  }

  protected choose(mode: SyncMode) {
    this.sync.directions.update((d) => withSyncMode(d, this.isPresenter, mode));
  }

  // A click anywhere outside closes the menu (Slidev's onClickOutside).
  protected closeOutside(e: MouseEvent) {
    if (this.open() && !this.el.contains(e.target as Node)) this.open.set(false);
  }
}
