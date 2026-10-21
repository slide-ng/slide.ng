import { ComponentRef, Injector, ViewContainerRef } from '@angular/core';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { readZoom } from './canvas';
import { Nav } from './nav';
import { RENDER_CONTEXT, RenderContext, SLIDE_GLOBALS, SLIDE_NO } from './slide-context';
import { SlideBase } from './slide-base';

// Creates the component of slide `no` (1-based) inside `host`, telling it where it is drawn.
export function mountSlide(
  host: ViewContainerRef,
  no: number,
  context: RenderContext,
): ComponentRef<SlideBase> {
  const injector = Injector.create({
    parent: host.injector,
    providers: [
      { provide: SLIDE_NO, useValue: no },
      { provide: RENDER_CONTEXT, useValue: context },
      {
        provide: SLIDE_GLOBALS,
        useValue: {
          nav: host.injector.get(Nav, null),
          frontmatter: SLIDES[no - 1].frontmatter,
          configs: HEADMATTER,
          themeConfigs: (HEADMATTER['themeConfig'] ?? {}) as Record<string, unknown>,
        },
      },
    ],
  });
  const ref = host.createComponent(SLIDES[no - 1].component, { injector });
  // `zoom` shrinks or enlarges the content of the slide (see styles.css).
  const zoom = readZoom(SLIDES[no - 1].frontmatter, HEADMATTER);
  if (zoom !== 1) {
    ref.location.nativeElement.dataset['zoom'] = 'on';
    ref.location.nativeElement.style.setProperty('--slidev-zoom', String(zoom));
  }
  return ref;
}
