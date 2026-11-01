import { Component, inject, input, isDevMode } from '@angular/core';
import { UI_TEXT, uiText } from '../i18n/ui-text';

// Shown when a slide fails to render. The texts are Slidev's: with a dev server there is a terminal to look at, in a static build only the network.
@Component({
  selector: 'sn-error',
  host: {
    class: 'block px-4 py-10 text-center text-red-700 dark:text-red-500 font-bold font-mono',
  },
  templateUrl: './error.html',
})
export class ErrorLayout {
  message = input(uiText(inject(UI_TEXT), isDevMode() ? 'slide.errorDev' : 'slide.errorBuild'));
}
