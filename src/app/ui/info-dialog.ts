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
          <div id="info-credit" class="text-sm">
            <span class="opacity-50">{{ credit[0] }}</span
            ><b>slide.ng</b><span class="opacity-50">{{ credit[1] }}</span>
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
