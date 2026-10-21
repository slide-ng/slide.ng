import { describe, expect, it } from 'vitest';
import { foldForSearch } from './goto';

describe('foldForSearch', () => {
  const finds = (title: string, query: string, lang?: string) =>
    foldForSearch(title, lang).includes(foldForSearch(query, lang));

  it('finds Turkish titles typed in any case, with or without the dots', () => {
    for (const q of ['izmir', 'IZMIR', 'İZMİR', 'İzmir'])
      expect(finds('İzmir', q, 'tr')).toBe(true);
    for (const q of ['ışık', 'IŞIK', 'Işık', 'isik']) expect(finds('Işık', q, 'tr')).toBe(true);
    for (const q of ['ilk', 'İLK']) expect(finds('İlk adım', q, 'tr')).toBe(true);
    expect(finds('İçindekiler', 'içindekiler', 'tr')).toBe(true);
  });

  it('also folds in another language, and ignores accents', () => {
    expect(finds('İzmir', 'izmir', 'en')).toBe(true);
    expect(finds('Café crème', 'cafe creme')).toBe(true);
    expect(finds('Intro', 'zzz', 'not a tag!')).toBe(false);
  });
});
