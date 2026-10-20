import { describe, expect, it } from 'vitest';
import { uncalledGlobals } from './global-context.mjs';

describe('uncalledGlobals', () => {
  it("finds Slidev's uncalled forms in interpolations, bindings and control flow", () => {
    expect(uncalledGlobals('<p>{{ $clicks }}</p>')).toEqual(['$clicks']);
    expect(uncalledGlobals('<div [class.on]="$page === 2"></div>')).toEqual(['$page']);
    expect(uncalledGlobals('@if ($clicks > 2) {\n<b>x</b>\n}')).toEqual(['$clicks']);
    // A call earlier in the condition does not hide an uncalled signal after it.
    expect(uncalledGlobals('@if ($clicks() > 0 && $page === 2) {\n<b>x</b>\n}')).toEqual(['$page']);
    expect(uncalledGlobals("<div [class.x]='$clicks > 0'></div>")).toEqual(['$clicks']);
    expect(uncalledGlobals('<div [style.width.%]="$page"></div>')).toEqual(['$page']);
    expect(uncalledGlobals('@let c = $clicks;\n{{ c }}')).toEqual(['$clicks']);
    expect(uncalledGlobals('@let c = $clicks();\n@let p = $page + 1;')).toEqual(['$page']);
    expect(uncalledGlobals('{{ $nav.currentPage }} {{ $slidev.nav.currentLayout }}')).toEqual([
      '$nav.currentPage',
      '$slidev.nav.currentLayout',
    ]);
  });

  it('accepts the called forms and the plain values', () => {
    const markup =
      '{{ $clicks() }} {{ $page() + 1 }} {{ $nav.currentPage() }} {{ $nav.total }} {{ $frontmatter.title }} {{ $slidev.configs.title }} <button (click)="$nav.next()"> {{ $nav.clicksTotal?.() }}';
    expect(uncalledGlobals(markup)).toEqual([]);
  });

  it('knows the previousNo signal that the slide hooks added to Nav', () => {
    expect(uncalledGlobals('{{ $nav.previousNo }}')).toEqual(['$nav.previousNo']);
    expect(uncalledGlobals('{{ $nav.previousNo() }}')).toEqual([]);
  });

  it('leaves text outside expressions alone', () => {
    expect(uncalledGlobals('<p>Slidev has $clicks and $page.</p>')).toEqual([]);
  });
});
