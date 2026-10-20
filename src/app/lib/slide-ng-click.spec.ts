import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ClicksContext } from './clicks';
import { SlideNgClick } from './slide-ng-click';

@Component({
  selector: 'two-steps',
  imports: [SlideNgClick],
  template: '<div id="a" slide-ng-click>A</div><div id="b" slide-ng-click>B</div>',
})
class TwoSteps {}

@Component({
  imports: [SlideNgClick, TwoSteps],
  providers: [ClicksContext],
  template: '<two-steps /><div id="c" slide-ng-click>C</div>',
})
class Slide {}

describe('SlideNgClick', () => {
  it('numbers the clicks inside a component in document order, like Slidev', async () => {
    const fixture = TestBed.createComponent(Slide);
    fixture.detectChanges();
    await fixture.whenStable();
    const start = (id: string) =>
      fixture.nativeElement.querySelector(`#${id}`).getAttribute('data-slidev-clicks-start');
    expect([start('a'), start('b'), start('c')]).toEqual(['1', '2', '3']);
  });
});

@Component({
  imports: [SlideNgClick],
  providers: [ClicksContext],
  template:
    '<div id="a" slide-ng-click>A</div><div id="h" slide-ng-click-hide="3">H</div>' +
    '<div id="n" slide-ng-click-hide>N</div>',
})
class HideAt {}

describe('slide-ng-click-hide with a value', () => {
  it('hides at that click, like v-click-hide="3" in Slidev; without one at the next click', async () => {
    const fixture = TestBed.createComponent(HideAt);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    expect(el('h').getAttribute('data-slidev-clicks-start')).toBe('3');
    expect(el('h').classList.contains('slidev-vclick-hidden')).toBe(false);
    expect(el('n').getAttribute('data-slidev-clicks-start')).toBe('2');
  });
});
