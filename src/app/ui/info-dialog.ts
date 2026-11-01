import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { HEADMATTER, INFO_HTML } from '../../slides/generated';
import { focusWhileOpen } from '../lib/dialog-focus';
import { splitAt } from '../i18n/ui-text';
import { Ui } from '../lib/ui-state';
import { SlideNgMark } from './slide-ng-mark';

// The "info" dialog: the deck's `info:` text from the headmatter (markdown), or its title, plus a credit line.
@Component({
  selector: 'app-info-dialog',
  imports: [SlideNgMark],
  templateUrl: './info-dialog.html',
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
