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

@Component({
  imports: [SlideNgClick],
  providers: [ClicksContext],
  template:
    '<div id="r" slide-ng-click="2" slide-ng-click-hide="3">R</div>' +
    '<div id="f" slide-ng-click="2" slide-ng-click-hide>F</div><div id="x" slide-ng-click="4">X</div>' +
    '<div id="t" slide-ng-click="2" slide-ng-click-hide="true">T</div>',
})
class ShowThenHide {}

describe('slide-ng-click with slide-ng-click-hide="n"', () => {
  it('shows at the click and hides at the hide click, like v-click="2" v-click-hide="3" in Slidev', async () => {
    const fixture = TestBed.createComponent(ShowThenHide);
    const ctx = fixture.debugElement.injector.get(ClicksContext);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    const hidden = (id: string) => el(id).classList.contains('slidev-vclick-hidden');
    expect(el('r').getAttribute('data-slidev-clicks-start')).toBe('2');
    expect(el('r').getAttribute('data-slidev-clicks-end')).toBe('3');
    const shown = [0, 1, 2, 3, 4].map((c) => {
      ctx.setCurrent(c);
      fixture.detectChanges();
      return [!hidden('r'), !hidden('f'), !hidden('t')];
    });
    // r: only at click 2; f (a bare hide flag) and t ("true" is the flag too): the click value is when it hides.
    expect(shown).toEqual([
      [false, true, true],
      [false, true, true],
      [true, false, false],
      [false, false, false],
      [false, false, false],
    ]);
  });
});

@Component({
  imports: [SlideNgClick],
  providers: [ClicksContext],
  template:
    '<div id="a" slide-ng-click click-anim="fade"><a href="#x">A</a></div>' +
    '<div id="b" slide-ng-click click-anim="fade" aria-hidden="true">B</div>',
})
class Faded {}

describe('slide-ng-click and screen readers', () => {
  it('makes an element inert until it is revealed, also when a preset such as fade keeps it visible', async () => {
    const fixture = TestBed.createComponent(Faded);
    const ctx = fixture.debugElement.injector.get(ClicksContext);
    fixture.detectChanges();
    await fixture.whenStable();
    const a = fixture.nativeElement.querySelector('#a') as HTMLElement;
    expect(a.classList.contains('slidev-vclick-anim-fade')).toBe(true);
    expect(a.hasAttribute('inert')).toBe(true); // also its link: no focus, no clicks
    ctx.setCurrent(2);
    fixture.detectChanges();
    expect(a.hasAttribute('inert')).toBe(false);
    // The deck's own aria-hidden stays.
    const b = fixture.nativeElement.querySelector('#b') as HTMLElement;
    expect(b.hasAttribute('inert')).toBe(false);
    expect(b.getAttribute('aria-hidden')).toBe('true');
  });
});
