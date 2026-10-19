import { inject, signal } from '@angular/core';
import { ClicksContext } from './clicks';
import type { Nav } from './nav';
import { RENDER_CONTEXT, SLIDE_GLOBALS, SLIDE_NO } from './slide-context';

// Frontmatter and headmatter keys are free, and templates read them with a dot as in Slidev (`$frontmatter.title`). With an
// index signature type the compiler would ask for `$frontmatter['title']` (noPropertyAccessFromIndexSignature).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Keys = any;

/** Base class of every generated slide. */
export class SlideBase {
  // Provided by the generated slide's `providers`, so each slide has its own.
  clicks = inject(ClicksContext);
  private readonly globals = inject(SLIDE_GLOBALS);

  // Slidev's global context (guide/global-context.md) under the same names. Values that change are signals and are
  // called in the template: `{{ $clicks() }}`, `@if ($page() === 2)`.
  /** The current click of this slide. */
  readonly $clicks = this.clicks.current;
  /** This slide's number, 1-based. */
  readonly $page = signal(inject(SLIDE_NO)).asReadonly();
  /** Where the slide is drawn: 'slide', 'presenter', 'previewNext', 'print' or 'overview'. */
  readonly $renderContext = signal(inject(RENDER_CONTEXT)).asReadonly();
  /** This slide's frontmatter. */
  readonly $frontmatter: Keys = this.globals.frontmatter;
  /** The navigation (lib/nav.ts): `currentPage()`, `currentLayout()`, `total`, `next()`, `go(no)`, ... Every page that
   * draws slides provides it. */
  readonly $nav = this.globals.nav as Nav;
  /** `nav`, `configs` (the headmatter) and `themeConfigs` (the headmatter's `themeConfig`). */
  readonly $slidev: { nav: Nav; configs: Keys; themeConfigs: Keys } = {
    nav: this.$nav,
    configs: this.globals.configs,
    themeConfigs: this.globals.themeConfigs,
  };
}
