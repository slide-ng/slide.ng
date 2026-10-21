import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ClicksContext } from './clicks';
import type { Nav } from './nav';
import { RENDER_CONTEXT, SLIDE_GLOBALS, SLIDE_NO } from './slide-context';
import { SlideBase } from './slide-base';

@Component({
  selector: 'test-slide',
  providers: [ClicksContext],
  template:
    '{{ $page() }}|{{ $clicks() }}|{{ $renderContext() }}|{{ $frontmatter["layout"] }}|{{ $slidev.configs["title"] }}',
})
class TestSlide extends SlideBase {}

describe('SlideBase', () => {
  it("gives a slide Slidev's global context under the same names", async () => {
    const nav = { total: 9 } as unknown as Nav;
    TestBed.configureTestingModule({
      providers: [
        { provide: SLIDE_NO, useValue: 3 },
        { provide: RENDER_CONTEXT, useValue: 'presenter' },
        {
          provide: SLIDE_GLOBALS,
          useValue: {
            nav,
            frontmatter: { layout: 'center' },
            configs: { title: 'Talk', themeConfig: { primary: 'red' } },
            themeConfigs: { primary: 'red' },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(TestSlide);
    await fixture.whenStable();
    const slide = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toBe('3|0|presenter|center|Talk');
    expect(slide.$nav).toBe(nav);
    expect(slide.$slidev.nav).toBe(nav);
    expect(slide.$slidev.themeConfigs).toEqual({ primary: 'red' });
    expect(slide.$clicks).toBe(slide.clicks.current);
  });
});
