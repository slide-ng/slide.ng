import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Nav } from '../lib/nav';
import { describe, expect, it } from 'vitest';
import { RENDER_CONTEXT, RenderContext } from '../lib/slide-context';
import { SlideVideo } from './slide-video';

function make(context: RenderContext, inputs: Record<string, unknown>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: RENDER_CONTEXT, useValue: context },
      { provide: Nav, useValue: { no: signal(1) } },
    ],
  });
  const fixture = TestBed.createComponent(SlideVideo);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
  // The test DOM has no media: give the element a length and a settable position.
  let time = 0;
  Object.defineProperty(video, 'duration', { value: 42 });
  Object.defineProperty(video, 'currentTime', { get: () => time, set: (v) => (time = v) });
  video.dispatchEvent(new Event('loadedmetadata'));
  return { video, time: () => time };
}

describe('SlideVideo in print', () => {
  it('printPoster replaces the poster where the video does not play', () => {
    expect(
      make('print', { poster: 'a.png', printPoster: 'b.png' }).video.getAttribute('poster'),
    ).toBe('b.png');
  });
  it('keeps the poster on the slide', () => {
    expect(
      make('slide', { poster: 'a.png', printPoster: 'b.png' }).video.getAttribute('poster'),
    ).toBe('a.png');
  });
  it('without a print poster shows the frame at printTimestamp, or at timestamp', () => {
    expect(make('print', { printTimestamp: '12' }).time()).toBe(12);
    expect(make('print', { timestamp: 5 }).time()).toBe(5);
  });
  it('printTimestamp last shows the end', () => {
    expect(make('print', { printTimestamp: 'last' }).time()).toBe(42);
  });
  it('a print poster alone does not seek', () => {
    expect(make('print', { printPoster: 'b.png', timestamp: 5 }).time()).toBe(0);
  });
});
