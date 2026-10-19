import { inject } from '@angular/core';
import { ClicksContext } from './clicks';
import { THEME_CONFIG } from './theme-config';

/** Base class of every generated slide. */
export class SlideBase {
  // Provided by the generated slide's `providers`, so each slide has its own.
  clicks = inject(ClicksContext);
  /** The deck's `themeConfig`, for `{{ themeConfig['primary'] }}` in a slide. */
  themeConfig = inject(THEME_CONFIG);
}
