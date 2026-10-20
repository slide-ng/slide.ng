import { describe, expect, it } from 'vitest';
import { angularLocale, isRtl, langOverride, normalizeLang, uiLangOf } from './lang.mjs';

describe('language tags', () => {
  it('spells a tag the usual way and refuses what is not one', () => {
    expect(normalizeLang('TR')).toBe('tr');
    expect(normalizeLang('pt_br')).toBe('pt-BR');
    expect(normalizeLang('zh-hans-cn')).toBe('zh-Hans-CN');
    expect(normalizeLang('../x')).toBe('');
    expect(normalizeLang(undefined)).toBe('');
  });

  it('takes uiLang, then lang, then English', () => {
    expect(uiLangOf({ lang: 'tr' })).toBe('tr');
    expect(uiLangOf({ lang: 'ar', uiLang: 'en' })).toBe('en');
    expect(uiLangOf({})).toBe('en');
  });

  it('knows the right-to-left languages', () => {
    expect(['ar', 'he', 'fa', 'ur', 'ar-EG'].every(isRtl)).toBe(true);
    expect(isRtl('tr')).toBe(false);
  });

  it('picks the Angular locale: the tag, its language, or en-US', () => {
    const has = (id: string) => ['tr', 'pt', 'pt-PT', 'en-GB'].includes(id);
    expect(angularLocale('tr', has)).toBe('tr');
    expect(angularLocale('pt-BR', has)).toBe('pt');
    expect(angularLocale('pt-PT', has)).toBe('pt-PT');
    expect(angularLocale('en-GB', has)).toBe('en-GB');
    expect(angularLocale('en-AU', has)).toBe('en-US');
    expect(angularLocale('xx', has)).toBe('en-US');
    expect(angularLocale(undefined, has)).toBe('en-US');
  });

  it('tries every prefix of the tag, longest first', () => {
    const has = (id: string) => ['zh', 'zh-Hant', 'sr', 'sr-Latn', 'en-GB'].includes(id);
    expect(angularLocale('zh-Hant-TW', has)).toBe('zh-Hant');
    expect(angularLocale('zh-Hans-CN', has)).toBe('zh');
    expect(angularLocale('sr-Latn-RS', has)).toBe('sr-Latn');
    expect(angularLocale('en-GB-oxendict', has)).toBe('en-GB');
    expect(angularLocale('en-AU-x', has)).toBe('en-US');
  });

  it('lets --lang (SLIDE_NG_LANG) set lang and uiLang for the run', () => {
    const headmatter: Record<string, unknown> = { lang: 'de', uiLang: 'de' };
    expect(langOverride(headmatter, 'pt_br')).toBe(headmatter);
    expect(headmatter).toEqual({ lang: 'pt-BR' });
    expect(uiLangOf(headmatter)).toBe('pt-BR');
    expect(langOverride({ lang: 'de' }, undefined)).toEqual({ lang: 'de' });
    expect(langOverride({ lang: 'de' }, '')).toEqual({ lang: 'de' });
    expect(() => langOverride({}, '../tr')).toThrow(/SLIDE_NG_LANG must be a language tag/);
  });
});
