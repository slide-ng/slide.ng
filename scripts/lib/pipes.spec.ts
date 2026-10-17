import { describe, expect, it } from 'vitest';
import { commonPipes, pipeNames } from './pipes.mjs';

describe('commonPipes', () => {
  it('finds pipes in interpolations, bindings and control flow', () => {
    expect(commonPipes('<p>{{ 1234.5 | number }} and {{ d | date:"short" }}</p>')).toEqual([
      'DatePipe',
      'DecimalPipe',
    ]);
    expect(commonPipes('<b [title]="name | uppercase">x</b>')).toEqual(['UpperCasePipe']);
    expect(commonPipes('@for (e of map | keyvalue; track e.key) {')).toEqual(['KeyValuePipe']);
  });
  it('finds pipes in @else if headers, single-quoted bindings and @for headers with object literals', () => {
    expect(commonPipes("} @else if ((v | uppercase) === 'A') {")).toEqual(['UpperCasePipe']);
    expect(commonPipes("<div [title]='12345 | number'></div>")).toEqual(['DecimalPipe']);
    expect(commonPipes('@for (e of {a: 1} | keyvalue; track e.key) {')).toEqual(['KeyValuePipe']);
  });
  it('lists every pipe name, also custom ones', () => {
    expect([...pipeNames('{{ name | initials }} {{ n | number }}')]).toEqual([
      'initials',
      'number',
    ]);
  });
  it('ignores prose, table text, logical or and unknown pipes', () => {
    expect(commonPipes('<td>a | number</td><p>pick one | date</p>')).toEqual([]);
    expect(commonPipes('{{ a || b }}')).toEqual([]);
    expect(commonPipes('{{ x | myOwnPipe }}')).toEqual([]);
  });
});
