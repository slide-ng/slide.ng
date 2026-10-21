import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClicksContext } from './clicks';
import { Nav } from './nav';
import { SlideNgClick } from './slide-ng-click';
import { SlideNgSwitch, parseSlots, switchTransition } from './slide-ng-switch';

const items = (...ats: string[]) => ats.map((at) => ({ el: document.createElement('div'), at }));
const range = (s: { start: number; end: number }) => [s.start, s.end];

describe('parseSlots', () => {
  it('a single number lasts until the next one starts', () => {
    const slots = parseSlots(items('1', '2', '5'));
    // sorted from the biggest start, as in Slidev
    expect(slots.map(range)).toEqual([
      [5, 6],
      [2, 5],
      [1, 2],
    ]);
  });
  it('a range is explicit', () => {
    expect(parseSlots(items('1', '2-4')).map(range)).toEqual([
      [2, 4],
      [1, 2],
    ]);
  });
  it('rejects a broken range', () => {
    expect(() => parseSlots(items('2-x'))).toThrow('Invalid range');
  });
});

describe('switchTransition', () => {
  it('a bare transition or true is a fade', () => {
    expect(switchTransition('')).toBe('fade');
    expect(switchTransition('true')).toBe('fade');
    expect(switchTransition(true)).toBe('fade');
  });
  it('a name is kept, false or nothing is none', () => {
    expect(switchTransition('slide-left')).toBe('slide-left');
    expect(switchTransition('false')).toBe(false);
    expect(switchTransition(undefined)).toBe(false);
  });
});

@Component({
  selector: 'one-click',
  imports: [SlideNgClick],
  template: '<span id="late" slide-ng-click>late</span>',
})
class OneClick {}

@Component({
  imports: [SlideNgSwitch, SlideNgClick, OneClick],
  providers: [ClicksContext, { provide: Nav, useValue: { direction: () => 1 } }],
  template: `
    <div id="before" slide-ng-click>before</div>
    <slide-ng-switch unmount>
      <div at="1"><span id="in1" slide-ng-click>in 1</span></div>
      <div at="2"><span id="in2" slide-ng-click>in 2</span></div>
    </slide-ng-switch>
    <div id="after" slide-ng-click>after</div>
    @if (more()) {
      <one-click />
    }
  `,
})
class UnmountSlide {
  more = signal(false);
}

describe('slide-ng-switch unmount and the click numbers', () => {
  it('a click after the switch keeps its number while children are out of the page', async () => {
    const fixture = TestBed.createComponent(UnmountSlide);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const ctx = fixture.debugElement.injector.get(ClicksContext);
    const start = (id: string) =>
      root.querySelector(`#${id}`)?.getAttribute('data-slidev-clicks-start');
    // Children go out of the page and come back; content that appears later makes the clicks renumber.
    for (const click of [1, 2, 3, 2, 0]) {
      ctx.setCurrent(click);
      fixture.detectChanges();
      await fixture.whenStable();
    }
    fixture.componentInstance.more.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    // before: 1, the switch: 2-3, the clicks inside its children: 4 and 5, after: 6, the late one: 7.
    expect([start('before'), start('after'), start('late')]).toEqual(['1', '6', '7']);
  });
});
