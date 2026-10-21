import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RENDER_CONTEXT, RenderContext } from '../lib/slide-context';
import { RenderWhen } from './render-when';

// The IntersectionObserver the component makes, so a test can say when the element is on screen.
let report: (visible: boolean) => void = () => {};
class FakeObserver {
  constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
    report = (visible) => callback([{ isIntersecting: visible }]);
  }
  observe() {}
  disconnect() {}
}

function make(context: RenderContext, wanted: string | string[]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: RENDER_CONTEXT, useValue: context }] });
  const fixture = TestBed.createComponent(RenderWhen);
  fixture.componentRef.setInput('context', wanted);
  fixture.detectChanges();
  const shown = () => (fixture.componentInstance as unknown as { show(): boolean }).show();
  return { fixture, shown };
}

describe('RenderWhen', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('matches the render context, and main for slide or presenter', () => {
    expect(make('slide', 'slide').shown()).toBe(true);
    expect(make('overview', 'slide').shown()).toBe(false);
    expect(make('presenter', 'main').shown()).toBe(true);
    expect(make('print', ['slide', 'print']).shown()).toBe(true);
  });
  it('visible follows the element entering and leaving the screen', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { fixture, shown } = make('slide', 'visible');
    expect(shown()).toBe(false);
    expect(fixture.nativeElement.style.display).toBe('block');
    report(true);
    expect(shown()).toBe(true);
    report(false);
    expect(shown()).toBe(false);
  });
  it('in a list, visible must hold and counts as a match itself, as in Slidev', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const slide = make('slide', ['main', 'visible']);
    expect(slide.shown()).toBe(false);
    report(true);
    expect(slide.shown()).toBe(true);
    const overview = make('overview', ['main', 'visible']);
    report(true);
    expect(overview.shown()).toBe(true);
  });
  it('visible always holds in print, wherever the slide is on the print page', () => {
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    const { fixture, shown } = make('print', 'visible');
    fixture.detectChanges();
    report(false);
    expect(shown()).toBe(true);
  });
});
