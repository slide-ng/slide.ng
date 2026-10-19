import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { HEADMATTER, INFO_HTML } from '../../slides/generated';
import { focusWhileOpen } from '../lib/dialog-focus';
import { splitAt } from '../i18n/ui-text';
import { Ui } from '../lib/ui-state';

// The "info" dialog: the deck's `info:` text from the headmatter (markdown), or its title, plus a credit line.
@Component({
  selector: 'app-info-dialog',
  template: `
    @if (ui.info()) {
      <div id="info-dialog" class="fixed inset-0 grid z-modal">
        <div class="absolute inset-0 -z-1 bg-black/80" (click)="ui.info.set(false)"></div>
        <div
          #box
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title"
          tabindex="-1"
          class="outline-none slidev-layout m-auto rounded-md bg-main text-main shadow dark:border dark:border-gray/20 px-6 py-4 flex flex-col gap-4 text-base max-w-150"
          style="height: auto"
        >
          @if (infoHtml) {
            <div [innerHTML]="infoHtml"></div>
          } @else {
            <div class="text-xl font-bold">{{ title }}</div>
          }
          <div id="info-credit" class="flex gap-1 items-center text-sm">
            <span class="opacity-50 mr-2">{{ credit[0] }}</span>
            <svg class="w-5 h-5" viewBox="13 6 102 113" fill="none" aria-hidden="true">
              <path
                d="M64 11L110 27 103 88 64 114 25 88 18 27Z"
                fill="#CC4209"
                stroke="#CC4209"
                stroke-width="10"
                stroke-linejoin="round"
              />
              <rect x="44" y="26" width="60" height="34" rx="6" fill="#8F300A" />
              <rect x="22" y="38" width="76" height="56" rx="10" fill="#CC4209" />
              <rect x="26" y="42" width="68" height="46" rx="6" fill="#561C08" />
              <rect x="26" y="42" width="68" height="38" rx="6" fill="#FAF6EE" />
              <circle cx="40" cy="51" r="4" fill="#CC4209" />
              <path d="M50.5 51h30.3" stroke="#CC4209" stroke-width="6" stroke-linecap="round" />
              <circle cx="40" cy="61" r="3.5" fill="#8F300A" />
              <path d="M50.25 61h21.7" stroke="#8F300A" stroke-width="5.5" stroke-linecap="round" />
              <circle cx="40" cy="71" r="3.5" fill="#8F300A" />
              <path d="M50.25 71h12.7" stroke="#8F300A" stroke-width="5.5" stroke-linecap="round" />
            </svg>
            <b>slide.ng</b>
            <span class="opacity-50">{{ credit[1] }}</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class InfoDialog {
  protected ui = inject(Ui);
  protected infoHtml = INFO_HTML;
  private box = viewChild<ElementRef<HTMLElement>>('box');
  protected title = (HEADMATTER['title'] as string | undefined) ?? 'slide.ng';
  // The name is bold, so the text is drawn in two parts around it.
  protected credit = splitAt(this.ui.text('info.credit'), 'name');

  constructor() {
    focusWhileOpen(this.ui.info, () => this.box()?.nativeElement);
  }
}
