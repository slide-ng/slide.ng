import { Component, ErrorHandler, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Nav } from './nav';
import { RENDER_CONTEXT, RenderContext, SLIDE_NO } from './slide-context';
import { isSlideActive, onSlideEnter, onSlideLeave } from './slide-hooks';

const log: string[] = [];

@Component({ selector: 'test-hooked', template: '' })
class Hooked {
  readonly active = isSlideActive();
  constructor() {
    onSlideEnter((to, from) => log.push(`enter ${to} ${from}`));
    onSlideLeave((to, from) => log.push(`leave ${to} ${from}`));
  }
}

@Component({ selector: 'test-throwing', template: '' })
class Throwing {
  constructor() {
    onSlideEnter(() => {
      throw new Error('enter failed');
    });
    onSlideLeave(() => {
      throw new Error('leave failed');
    });
    onSlideEnter((to) => log.push(`sibling enter ${to}`));
    onSlideLeave((to) => log.push(`sibling leave ${to}`));
  }
}

// Slide 2 drawn in `context`, with a Nav whose shown slide is `shown`.
async function mount(context: RenderContext, start = 2, withNav = true) {
  log.length = 0;
  const shown = signal(start);
  const previous = signal<number | undefined>(undefined);
  TestBed.configureTestingModule({
    providers: [
      { provide: SLIDE_NO, useValue: 2 },
      { provide: RENDER_CONTEXT, useValue: context },
      ...(withNav ? [{ provide: Nav, useValue: { no: shown, previousNo: previous } }] : []),
    ],
  });
  const fixture = TestBed.createComponent(Hooked);
  await fixture.whenStable();
  const go = async (no: number) => {
    shown.set(no);
    await fixture.whenStable();
  };
  return { fixture, go };
}

describe('slide hooks', () => {
  it('gives the first call the slide shown before, when the slide was created by a move', async () => {
    log.length = 0;
    TestBed.configureTestingModule({
      providers: [
        { provide: SLIDE_NO, useValue: 2 },
        { provide: RENDER_CONTEXT, useValue: 'slide' },
        { provide: Nav, useValue: { no: signal(2), previousNo: signal(1) } },
      ],
    });
    await TestBed.createComponent(Hooked).whenStable();
    expect(log).toEqual(['enter 2 1']);
  });

  it('enters once drawn when the slide is already shown, then on every return', async () => {
    const { fixture, go } = await mount('slide');
    expect(log).toEqual(['enter 2 undefined']);
    expect(fixture.componentInstance.active()).toBe(true);
    await go(3);
    expect(log.at(-1)).toBe('leave 3 2');
    expect(fixture.componentInstance.active()).toBe(false);
    await go(1);
    await go(2);
    expect(log).toEqual(['enter 2 undefined', 'leave 3 2', 'enter 2 1']);
  });

  it('does not enter while another slide is shown', async () => {
    const { go } = await mount('presenter', 1);
    expect(log).toEqual([]);
    await go(2);
    expect(log).toEqual(['enter 2 1']);
  });

  it('leaves when the slide is destroyed after another one was shown', async () => {
    const { fixture } = await mount('slide');
    (TestBed.inject(Nav).no as ReturnType<typeof signal<number>>).set(3); // the deck destroys the slide before its effect runs
    fixture.destroy();
    expect(log).toEqual(['enter 2 undefined', 'leave 3 2']);
  });

  it('reports a hook that throws and still runs the other hooks', async () => {
    log.length = 0;
    const errors: unknown[] = [];
    const shown = signal(2);
    TestBed.configureTestingModule({
      providers: [
        { provide: SLIDE_NO, useValue: 2 },
        { provide: RENDER_CONTEXT, useValue: 'slide' },
        { provide: Nav, useValue: { no: shown, previousNo: signal(undefined) } },
        {
          provide: ErrorHandler,
          useValue: { handleError: (error: unknown) => errors.push(error) },
        },
      ],
    });
    const fixture = TestBed.createComponent(Throwing);
    await fixture.whenStable();
    shown.set(3);
    await fixture.whenStable();
    shown.set(2);
    await fixture.whenStable();
    shown.set(4);
    fixture.destroy();
    expect(log).toEqual([
      'sibling enter 2',
      'sibling leave 3',
      'sibling enter 2',
      'sibling leave 4',
    ]);
    expect(errors.map((error) => (error as Error).message)).toEqual([
      'enter failed',
      'leave failed',
      'enter failed',
      'leave failed',
    ]);
  });

  it('stays quiet in thumbnails and the next slide preview', async () => {
    for (const context of ['overview', 'previewNext'] as const) {
      TestBed.resetTestingModule();
      const { fixture, go } = await mount(context);
      await go(3);
      expect(log).toEqual([]);
      expect(fixture.componentInstance.active()).toBe(false);
    }
  });

  it('enters once per page in print, as in Slidev, whatever slide the deck presents, and never leaves', async () => {
    const { fixture, go } = await mount('print', 5);
    expect(log).toEqual(['enter 2 undefined']);
    await go(3);
    await go(2);
    fixture.destroy();
    expect(log).toEqual(['enter 2 undefined']);
    expect(fixture.componentInstance.active()).toBe(true);
  });

  it('reports an enter hook that throws in print', async () => {
    log.length = 0;
    const errors: unknown[] = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: SLIDE_NO, useValue: 2 },
        { provide: RENDER_CONTEXT, useValue: 'print' },
        { provide: ErrorHandler, useValue: { handleError: (e: unknown) => errors.push(e) } },
      ],
    });
    await TestBed.createComponent(Throwing).whenStable();
    expect(log).toEqual(['sibling enter 2']);
    expect(errors.map((error) => (error as Error).message)).toEqual(['enter failed']);
  });

  it('works without a Nav (a component drawn outside a deck)', async () => {
    const { fixture } = await mount('slide', 2, false);
    expect(log).toEqual([]);
    expect(fixture.componentInstance.active()).toBe(false);
  });
});
