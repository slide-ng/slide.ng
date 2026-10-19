import { describe, expect, it } from 'vitest';
import { uncalledGlobals } from './global-context.mjs';

describe('uncalledGlobals', () => {
  it("finds Slidev's uncalled forms in interpolations, bindings and control flow", () => {
    expect(uncalledGlobals('<p>{{ $clicks }}</p>')).toEqual(['$clicks']);
    expect(uncalledGlobals('<div [class.on]="$page === 2"></div>')).toEqual(['$page']);
    expect(uncalledGlobals('@if ($clicks > 2) {\n<b>x</b>\n}')).toEqual(['$clicks']);
    expect(uncalledGlobals('{{ $nav.currentPage }} {{ $slidev.nav.currentLayout }}')).toEqual([
      '$nav.currentPage',
      '$slidev.nav.currentLayout',
    ]);
  });

  it('accepts the called forms and the plain values', () => {
    const markup =
      '{{ $clicks() }} {{ $page() + 1 }} {{ $nav.currentPage() }} {{ $nav.total }} {{ $frontmatter.title }} {{ $slidev.configs.title }} <button (click)="$nav.next()">';
    expect(uncalledGlobals(markup)).toEqual([]);
  });

  it('leaves text outside expressions alone', () => {
    expect(uncalledGlobals('<p>Slidev has $clicks and $page.</p>')).toEqual([]);
  });
});
