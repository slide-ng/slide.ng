import {
  DeckLanguage,
  chooseLanguage,
  languageName,
  pickLanguage,
  storedLanguage,
} from './languages';

const LANGUAGES: DeckLanguage[] = [
  { lang: 'en', dir: '', title: 'Talk' },
  { lang: 'ar', dir: 'rtl', title: 'محاضرة' },
];

describe('a deck in several languages', () => {
  const html = document.documentElement;
  const before = { lang: html.lang, dir: html.getAttribute('dir'), title: document.title };
  afterEach(() => {
    localStorage.removeItem('slide-ng-language');
    html.lang = before.lang;
    if (before.dir == null) html.removeAttribute('dir');
    else html.dir = before.dir;
    document.title = before.title;
  });

  it('starts in the default language, and sets the page for it', () => {
    expect(pickLanguage(LANGUAGES, 'en')).toBe('en');
    expect(html.lang).toBe('en');
    expect(html.hasAttribute('dir')).toBe(false);
    expect(document.title).toBe('Talk');
  });
  it('starts in the stored language when it is one of the deck', () => {
    localStorage.setItem('slide-ng-language', 'ar');
    expect(pickLanguage(LANGUAGES, 'en')).toBe('ar');
    expect([html.lang, html.dir, document.title]).toEqual(['ar', 'rtl', 'محاضرة']);
    localStorage.setItem('slide-ng-language', 'de');
    expect(pickLanguage(LANGUAGES, 'en')).toBe('en');
  });
  it('stores a choice under the key of this deck', () => {
    const load = vi.fn();
    chooseLanguage('ar', load);
    expect(storedLanguage()).toBe('ar');
    expect(load).toHaveBeenCalledOnce();
  });
  it('names each language in its own language, with a capital', () => {
    expect(languageName('tr')).toBe('Türkçe');
    expect(languageName('en')).toBe('English');
    expect(languageName('fr')).toBe('Français');
  });
});
