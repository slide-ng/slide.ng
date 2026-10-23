import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ClicksContext } from './clicks';
import { Nav } from './nav';
import { RENDER_CONTEXT } from './slide-context';
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

@Component({
  imports: [SlideNgSwitch],
  providers: [
    ClicksContext,
    { provide: Nav, useValue: { direction: () => 1 } },
    { provide: RENDER_CONTEXT, useValue: 'slide' },
  ],
  template: `
    <style>
      .swing-enter-active,
      .swing-leave-active {
        transition: opacity 40ms;
      }
      .swing-enter-from,
      .swing-leave-to {
        opacity: 0;
      }
    </style>
    <slide-ng-switch transition="swing">
      <div id="a" at="1">a</div>
      <div id="b" at="2">b</div>
    </slide-ng-switch>
  `,
})
class SwingSlide {}

describe('slide-ng-switch with a custom transition name', () => {
  it("runs Vue's classes with the deck's CSS, as slide transitions do", async () => {
    const fixture = TestBed.createComponent(SwingSlide);
    fixture.detectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const ctx = fixture.debugElement.injector.get(ClicksContext);
    const [a, b] = ['#a', '#b'].map((s) => root.querySelector(s)!);
    ctx.setCurrent(1);
    fixture.detectChanges();
    await fixture.whenStable();
    ctx.setCurrent(2);
    fixture.detectChanges();
    expect(b.classList).toContain('swing-enter-active');
    expect(a.classList).toContain('swing-leave-active');
    // The leaving child is hidden only when its transition ends.
    expect(a.classList).not.toContain('slidev-vclick-display-none');
    await new Promise((r) => setTimeout(r, 300));
    expect(b.classList).not.toContain('swing-enter-active');
    expect(a.classList).toContain('slidev-vclick-display-none');
  });
});
