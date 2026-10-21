import { describe, expect, it } from 'vitest';
import { checkClickValues, clickSettings } from './click-values.mjs';

const warnings = (markdown: string) => {
  const found: string[] = [];
  checkClickValues(markdown, (m: string, line: number) => found.push(`${line}: ${m}`));
  return found;
};

describe('clickSettings', () => {
  const read = (frontmatter: Record<string, unknown>) => {
    const found: string[] = [];
    return { ...clickSettings(frontmatter, (m: string) => found.push(m)), found };
  };
  it('reads numbers, and numbers written as text', () => {
    expect(read({ clicks: 3, clicksStart: '1' })).toEqual({ clicks: 3, clicksStart: 1, found: [] });
    expect(read({})).toEqual({ clicks: null, clicksStart: null, found: [] });
  });
  it('ignores what is not a number, and a negative clicks', () => {
    const r = read({ clicks: 'abc', clicksStart: [1] });
    expect([r.clicks, r.clicksStart]).toEqual([null, null]);
    expect(r.found).toEqual([
      'clicks: "abc" is not a number, it is ignored',
      'clicksStart: [1] is not a number, it is ignored',
    ]);
    expect(read({ clicks: -1 }).clicks).toBe(null);
  });
  it('uses 0 for a negative clicksStart', () => {
    const r = read({ clicksStart: -2 });
    expect(r.clicksStart).toBe(0);
    expect(r.found).toEqual(['clicksStart: -2 is below 0, 0 is used']);
  });
});

describe('checkClickValues', () => {
  it('lets good values pass', () => {
    const good = [
      '<div slide-ng-click>a</div>',
      '<div slide-ng-click="2">a</div>',
      '<div slide-ng-click="+2">a</div>',
      '<div slide-ng-click.fade="1.5">a</div>',
      '<div slide-ng-click>a</div>\n<div slide-ng-click="-1">b</div>',
      '<div [slide-ng-click]="[2, 4]">a</div>',
      "<div [slide-ng-click]=\"['+1', '+2']\">a</div>",
      '<div [slide-ng-click]="range">a</div>',
      '<slide-ng-switch at="2">\n<div at="1">a</div>\n<div at="2-4">b</div>\n</slide-ng-switch>',
      '<p at="x">not in a switch</p>',
      '<slide-ng-switch>\n<div at="3 - 5">a</div>\n</slide-ng-switch>',
    ];
    for (const md of good) expect(warnings(md)).toEqual([]);
  });

  it('names a value that is not a click, with its line', () => {
    expect(warnings('# t\n\n<div slide-ng-click="abc">x</div>')).toEqual([
      '2: slide-ng-click="abc" is not a click (a number, +n or -n); the element is always shown',
    ]);
  });

  it('says that clicks count from 1', () => {
    expect(warnings('<div slide-ng-click="0">x</div>')).toEqual([
      '0: slide-ng-click="0": clicks count from 1, so it is shown at click 1',
    ]);
    expect(warnings('<div slide-ng-click.up="-2">x</div>')).toEqual([
      '0: slide-ng-click.up="-2" counts back from the click before it, and there is none; the element is always shown',
    ]);
  });

  it('says how to write a range', () => {
    expect(warnings('<div slide-ng-click="[2, 4]">x</div>')).toEqual([
      '0: slide-ng-click="[2, 4]" is text, not a range; write a range as a binding: [slide-ng-click]="[2, 4]"',
    ]);
    expect(
      warnings('<div [slide-ng-click]="[2]">x</div>\n<div [slide-ng-click]="[]">y</div>'),
    ).toEqual([
      '0: [slide-ng-click]="[2]": a range has two values, [start, end]; for one click write slide-ng-click="2"',
      '1: [slide-ng-click]="[]": a range has two values, [start, end]',
    ]);
    expect(warnings('<div [slide-ng-click]="[3, 1]">x</div>')[0]).toContain('is never shown');
    expect(warnings('<div [slide-ng-click]="[0, 0]">x</div>')[0]).toContain('is never shown');
    expect(warnings('<div [slide-ng-click]="[-1, 2]">x</div>')).toEqual([
      '0: [slide-ng-click]="[-1, 2]": clicks count from 1, so it starts at click 1',
    ]);
  });

  it('checks the at of switch children', () => {
    expect(
      warnings('<slide-ng-switch>\n<div at="x">x</div>\n<div at="5-3">y</div>\n</slide-ng-switch>'),
    ).toEqual([
      '1: <div at="x"> in <slide-ng-switch>: write a click (3) or a range (3-5)',
      '2: <div at="5-3"> in <slide-ng-switch> is never shown: the end must be after the start',
    ]);
    expect(
      warnings('<slide-ng-switch><div at=" 3">a</div><div at="1-2-3">b</div></slide-ng-switch>'),
    ).toHaveLength(2);
  });

  it('does not look into code, and keeps the line numbers after it', () => {
    expect(
      warnings(
        '```html\n<div slide-ng-click="abc">x</div>\n```\n`<b slide-ng-click="0">`\n<i slide-ng-click="0">i</i>',
      ),
    ).toEqual(['4: slide-ng-click="0": clicks count from 1, so it is shown at click 1']);
  });
});
