import { TestBed } from '@angular/core/testing';
import { ClickPart, ClicksContext } from '../lib/clicks';
import { changesOf, previewMarks } from './click-preview';

function make() {
  TestBed.configureTestingModule({ providers: [ClicksContext] });
  return TestBed.inject(ClicksContext);
}
const el = () => document.createElement('div');

describe('changesOf', () => {
  it('a click that stays shown changes once, where it starts', () => {
    const info = make().calculateSince(3)!;
    expect(changesOf({ el: el(), info })).toEqual([3]);
  });
  it('a range changes where it starts and where it ends', () => {
    const info = make().calculateRange([2, 4])!;
    expect(changesOf({ el: el(), info })).toEqual([2, 4]);
  });
  it('a part that spans clicks (code steps) changes on each of them', () => {
    const info = make().calculateSince(2, 3)!;
    expect(changesOf({ el: el(), info })).toEqual([2, 3, 4]);
  });
  it('a code block with one range takes no click and never changes', () => {
    const info = make().calculateSince('+1', 0)!;
    expect(changesOf({ el: el(), info })).toEqual([]);
  });
  it('a fractional click changes at the whole click the nav steps to', () => {
    const c = make();
    expect(changesOf({ el: el(), info: c.calculateSince(0.5)! })).toEqual([1]);
    expect(changesOf({ el: el(), info: c.calculateRange([1.5, 2.5])! })).toEqual([2, 3]);
  });
  it('a range that no click is in never changes', () => {
    const c = make();
    expect(changesOf({ el: el(), info: c.calculateRange([0, 0])! })).toEqual([]);
    expect(changesOf({ el: el(), info: c.calculateRange([3, 1])! })).toEqual([]);
  });
  it('steps of their own win, sorted and without repeats', () => {
    const info = make().calculateSince(1, 4)!;
    expect(changesOf({ el: el(), info, steps: [3, 1, 3, 5] })).toEqual([1, 3, 5]);
  });
});

describe('previewMarks', () => {
  const ctx = () => make();
  it('marks what later clicks change, the next click apart from the others', () => {
    const c = ctx();
    const [a, b, d] = [el(), el(), el()];
    const parts: ClickPart[] = [
      { el: a, info: c.calculateSince(1)! },
      { el: b, info: c.calculateSince(2)! },
      { el: d, info: c.calculateSince(3)! },
    ];
    expect(previewMarks(parts, 1, 3)).toEqual([
      { el: b, at: 2, isNext: true },
      { el: d, at: 3, isNext: false },
    ]);
  });
  it('marks a fractional click with the click it shows at, and not a range that never shows', () => {
    const c = ctx();
    const [a, b] = [el(), el()];
    const parts: ClickPart[] = [
      { el: a, info: c.calculateSince(0.5)! },
      { el: b, info: c.calculateRange([0, 0])! },
    ];
    expect(previewMarks(parts, 0, 1)).toEqual([{ el: a, at: 1, isNext: true }]);
  });
  it('a fractional total is reached by the next whole click, and nothing is marked there', () => {
    const c = ctx();
    const a = el();
    const parts: ClickPart[] = [{ el: a, info: c.calculateSince(1.5)! }];
    expect(previewMarks(parts, 1, 1.5)).toEqual([{ el: a, at: 2, isNext: true }]);
    expect(previewMarks([{ el: a, info: c.calculateSince(0.5)! }], 0, 0.5)).toEqual([
      { el: a, at: 1, isNext: true },
    ]);
    expect(previewMarks(parts, 1.5, 1.5)).toEqual([]);
  });
  it('an element with several parts gets its earliest click', () => {
    const c = ctx();
    const a = el();
    const parts: ClickPart[] = [
      { el: a, info: c.calculateSince(4)! },
      { el: a, info: c.calculateSince(2)! },
    ];
    expect(previewMarks(parts, 0, 4)).toEqual([{ el: a, at: 2, isNext: false }]);
  });
  it('a range that is on screen is marked where it ends', () => {
    const c = ctx();
    const a = el();
    expect(previewMarks([{ el: a, info: c.calculateRange([1, 3])! }], 1, 3)).toEqual([
      { el: a, at: 3, isNext: false },
    ]);
  });
  it('leaves out clicks the slide never reaches', () => {
    const c = ctx();
    expect(previewMarks([{ el: el(), info: c.calculateSince(5)! }], 0, 3)).toEqual([]);
  });
  it('marks nothing at the last click', () => {
    const c = ctx();
    expect(previewMarks([{ el: el(), info: c.calculateSince(2)! }], 2, 2)).toEqual([]);
  });
});

describe('ClicksContext parts', () => {
  it('keeps the elements that registered with one, not the gaps', () => {
    const c = make();
    const a = el();
    c.register('a', c.calculateSince('+1'), { el: a });
    c.register('gap', { delta: 2, max: 3 });
    TestBed.tick();
    expect(c.parts().map((p) => [p.el, p.info.start])).toEqual([[a, 1]]);
    c.unregister('a');
    expect(c.parts()).toEqual([]);
  });
});
