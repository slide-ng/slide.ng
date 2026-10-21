import { InjectionToken } from '@angular/core';
import type { Nav } from './nav';

// Where a slide is drawn. `<slide-ng-render-when context="...">` looks at this.
export type RenderContext = 'slide' | 'presenter' | 'previewNext' | 'print' | 'overview';

// Each slide component is created with these two, so built-in components know which slide they are in.
export const SLIDE_NO = new InjectionToken<number>('SLIDE_NO', { factory: () => 1 });
export const RENDER_CONTEXT = new InjectionToken<RenderContext>('RENDER_CONTEXT', {
  factory: () => 'slide',
});

// The click of the frame a global layer is drawn with (a print page, the next-step preview), for a
// `<slide-ng-progress-bar>` in that layer. Not given on the live slide, where `Nav` has the click.
export const LAYER_STEP = new InjectionToken<() => { current: number; total: number } | null>(
  'LAYER_STEP',
);
/** What a slide's `$nav`, `$frontmatter` and `$slidev` read (lib/slide-base.ts). mountSlide provides it; it does not import the
 * generated index itself, which imports every slide. */
export interface SlideGlobals {
  nav: Nav | null;
  frontmatter: Record<string, unknown>;
  configs: Record<string, unknown>;
  themeConfigs: Record<string, unknown>;
}
export const SLIDE_GLOBALS = new InjectionToken<SlideGlobals>('SLIDE_GLOBALS', {
  factory: () => ({ nav: null, frontmatter: {}, configs: {}, themeConfigs: {} }),
});
