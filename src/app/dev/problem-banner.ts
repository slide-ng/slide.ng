import { Component, isDevMode } from '@angular/core';
import { LAST_GOOD, PROBLEM } from '../../slides/generated/problem';
import { T } from '../i18n/t';

// In the dev server, a slides.md the generator cannot read (broken YAML) leaves the last good slides on screen; a `src:` file
// that is missing leaves out its slides. This banner says why, until the file is fixed. A build never has a problem to show.
@Component({
  selector: 'app-problem-banner',
  imports: [T],
  template: `@if (problem) {
    <div
      role="alert"
      class="fixed top-0 inset-x-0 z-100 px-4 py-2 bg-red-700 text-white text-sm font-mono whitespace-pre-wrap"
    >
      @if (lastGood) {
        {{ 'editor.problem' | t: { problem } }}
      } @else {
        Some slides could not be read and are left out: {{ problem }}
      }
    </div>
  }`,
})
export class ProblemBanner {
  protected problem = isDevMode() ? PROBLEM : '';
  protected lastGood = LAST_GOOD;
}
