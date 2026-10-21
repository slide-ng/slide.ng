import { TestBed } from '@angular/core/testing';
import { EN } from './en';
import { T } from './t';
import { UI_TEXT, fillPlaceholders, mergeUiText, splitAt, uiText } from './ui-text';

describe('interface text', () => {
  it('fills placeholders and keeps the ones without a value', () => {
    expect(fillPlaceholders('Slide {no} of {total}', { no: 3, total: 9 })).toBe('Slide 3 of 9');
    expect(fillPlaceholders('Made with {name}', {})).toBe('Made with {name}');
  });

  it('puts a translation over English key by key and ignores unknown keys', () => {
    const text = mergeUiText({ 'nav.next': 'Sonraki', 'nav.nope': 'x' });
    expect(text['nav.next']).toBe('Sonraki');
    expect(text['nav.prev']).toBe(EN['nav.prev']);
    expect('nav.nope' in text).toBe(false);
  });

  it('makes every text an isolate of the interface direction when the page runs the other way', () => {
    const ltr = mergeUiText({}, 'ltr');
    expect(ltr['presenter.noNotes']).toBe(`\u2066${EN['presenter.noNotes']}\u2069`);
    expect(mergeUiText({ 'nav.next': 'التالي' }, 'rtl')['nav.next']).toBe('\u2067التالي\u2069');
    expect(mergeUiText({})['nav.next']).toBe(EN['nav.next']);
  });

  it('splits a text around a placeholder drawn as markup', () => {
    expect(splitAt('Made with {name}, inspired by Slidev', 'name')).toEqual([
      'Made with ',
      ', inspired by Slidev',
    ]);
    expect(splitAt('{name} ile', 'name')).toEqual(['', ' ile']);
    expect(splitAt('no placeholder', 'name')).toEqual(['no placeholder', '']);
  });

  it('the t pipe and uiText read the provided dictionary, English by default', () => {
    expect(TestBed.runInInjectionContext(() => new T()).transform('nav.next')).toBe(EN['nav.next']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: UI_TEXT, useValue: mergeUiText({ 'presenter.noNotes': 'Slayt {no} boş.' }) },
      ],
    });
    const pipe = TestBed.runInInjectionContext(() => new T());
    expect(pipe.transform('presenter.noNotes', { no: 3 })).toBe('Slayt 3 boş.');
    expect(uiText(TestBed.inject(UI_TEXT), 'nav.next')).toBe(EN['nav.next']);
  });
});
