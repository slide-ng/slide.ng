import { Component, isDevMode } from '@angular/core';
import { PROBLEM } from '../../slides/generated/problem';
import { T } from '../i18n/t';

// In the dev server, a slides.md the generator cannot read (broken YAML, a missing import) leaves the last good slides on
// screen. This banner says why, until the file is fixed. A build never has a problem to show.
@Component({
  selector: 'app-problem-banner',
  imports: [T],
  template: `@if (problem) {
    <div
      role="alert"
      class="fixed top-0 inset-x-0 z-100 px-4 py-2 bg-red-700 text-white text-sm font-mono whitespace-pre-wrap"
    >
      {{ 'editor.problem' | t: { problem } }}
    </div>
  }`,
})
export class ProblemBanner {
  protected problem = isDevMode() ? PROBLEM : '';
}
