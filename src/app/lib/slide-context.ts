import { InjectionToken } from '@angular/core';

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
