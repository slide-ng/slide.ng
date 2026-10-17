import { ComponentRef, ViewContainerRef } from '@angular/core';
import { SlideBase } from './slide-base';
import { Stage } from './stage';

function fakeSlide(no: number) {
  const element = document.createElement('div');
  Object.assign(element, { getAnimations: () => [] }); // not in the test DOM
  const ref = {
    instance: { no },
    location: { nativeElement: element },
    changeDetectorRef: { detectChanges() {} },
    destroyed: false,
    destroy() {
      this.destroyed = true;
    },
  };
  return ref as unknown as ComponentRef<SlideBase> & {
    destroyed: boolean;
    instance: { no: number };
  };
}

describe('Stage with a view transition', () => {
  const doc = document as unknown as { startViewTransition?: (update: () => void) => unknown };
  let swaps: (() => void)[];
  let made: ReturnType<typeof fakeSlide>[];
  let stage: Stage;

  beforeEach(() => {
    swaps = [];
    made = [];
    doc.startViewTransition = (update) => swaps.push(update);
    stage = new Stage({} as ViewContainerRef, document.createElement('div'), 'slide', (_h, no) => {
      made.push(fakeSlide(no));
      return made[made.length - 1];
    });
  });
  afterEach(() => delete doc.startViewTransition);

  it('returns the new slide, not the one that is leaving', () => {
    stage.show(1, null);
    const shown = stage.show(2, 'view-transition') as unknown as { no: number };
    expect(shown.no).toBe(2);
  });

  it('keeps the old slide until the browser runs the swap', () => {
    stage.show(1, null);
    stage.show(2, 'view-transition');
    expect(made[0].destroyed).toBe(false);
    expect(made[1].location.nativeElement.style.display).toBe('none');
    swaps[0]();
    expect(made[0].destroyed).toBe(true);
    expect(made[1].location.nativeElement.style.display).toBe('');
  });

  it('leaves one slide after two quick moves', () => {
    stage.show(1, null);
    stage.show(2, 'view-transition');
    stage.show(3, 'view-transition');
    swaps.forEach((swap) => swap());
    expect(made.map((m) => m.destroyed)).toEqual([true, true, false]);
  });
});
