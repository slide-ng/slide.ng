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
