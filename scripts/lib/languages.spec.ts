// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { indexSource } from './index-source.mjs';
import {
  baseHeadmatter,
  deckInLanguage,
  keyPlace,
  languageIndexSource,
  languageSlideFile,
  languagesSource,
  pairSlides,
  pickedLanguage,
  readLanguages,
} from './languages.mjs';
import { parseDeck } from './parse-deck.mjs';

const ENTRY = '/deck/slides.md';
const exists = () => true;
const read = (headmatter: Record<string, unknown>, warn: (m: string) => void = () => {}) =>
  readLanguages(headmatter, ENTRY, warn, { exists, text: '---\ntitle: T\nlanguages:\n---\n' });

describe('readLanguages', () => {
  it('is null without languages, or with the entry file alone (with a warning)', () => {
    expect(read({ title: 'T' })).toBeNull();
    const warnings: string[] = [];
    expect(read({ languages: { en: 'slides.md' } }, (m) => warnings.push(m))).toBeNull();
    expect(warnings).toEqual([
      '/deck/slides.md:3: languages lists only this file, so there is no language to switch to',
    ]);
  });
  it('lists the files by language, the entry file first, in the usual spelling', () => {
    expect(
      read({ languages: { pt_br: 'slides.pt.md', en: 'slides.md', tr: './tr/slides.md' } }),
    ).toEqual([
      { lang: 'en', file: '/deck/slides.md' },
      { lang: 'pt-BR', file: '/deck/slides.pt.md' },
      { lang: 'tr', file: '/deck/tr/slides.md' },
    ]);
  });
  it('adds the entry file in its own language when it is not listed', () => {
    const warnings: string[] = [];
    expect(
      read({ lang: 'de', languages: { tr: 'slides.tr.md' } }, (m) => warnings.push(m)),
    ).toEqual([
      { lang: 'de', file: '/deck/slides.md' },
      { lang: 'tr', file: '/deck/slides.tr.md' },
    ]);
    expect(warnings[0]).toContain('does not list this file; it is used as de');
  });
  it('throws with the file and line of languages for a value it cannot use', () => {
    expect(() => read({ languages: ['slides.md'] })).toThrow(
      /^\/deck\/slides\.md:3: languages should map/,
    );
    expect(() => read({ languages: { 'not a tag': 'x.md' } })).toThrow('is not a language tag');
    expect(() => read({ languages: { en: 'slides.md', tr: 'slides.tr.txt' } })).toThrow(
      'languages.tr should name a markdown file',
    );
    expect(() => read({ languages: { en: 'slides.md', EN: 'b.md' } })).toThrow('lists en twice');
    expect(() => read({ languages: { en: 'slides.md', tr: 'slides.md' } })).toThrow(
      'for two languages',
    );
    expect(() => read({ languages: { en: 'slides.md', tr: '../other/slides.md' } })).toThrow(
      "outside the deck's folder",
    );
    expect(() =>
      readLanguages({ languages: { en: 'slides.md', tr: 'gone.md' } }, ENTRY, () => {}, {
        exists: () => false,
        text: '',
      }),
    ).toThrow('languages.tr: gone.md not found');
  });
  it('names the config file and line when only the config file sets languages', () => {
    const config = { file: '/deck/slide-ng.config.yaml', lines: { title: 1, languages: 2 } };
    const text = '---\ntitle: T\n---\n';
    expect(() =>
      readLanguages({ languages: ['slides.md'] }, ENTRY, () => {}, { exists, text, config }),
    ).toThrow(/^\/deck\/slide-ng\.config\.yaml:2: languages should map/);
    expect(() =>
      readLanguages({ languages: ['slides.md'] }, ENTRY, () => {}, {
        exists,
        text: '---\nlanguages: x\n---\n',
        config,
      }),
    ).toThrow(/^\/deck\/slides\.md:2: languages should map/);
  });
});

describe('keyPlace and baseHeadmatter', () => {
  it('finds the line of a headmatter key', () => {
    expect(keyPlace('a.md', 'languages', '---\ntitle: x\nlanguages:\n  en: a.md\n---')).toBe(
      'a.md:3',
    );
    expect(keyPlace('a.md', 'languages', '---\n---')).toBe('a.md');
  });
  it('gives a translation the entry headmatter without its languages and uiLang', () => {
    expect(baseHeadmatter({ title: 'T', theme: 'x', uiLang: 'en', languages: {} })).toEqual({
      title: 'T',
      theme: 'x',
    });
  });
});

describe('pickedLanguage', () => {
  const list = [
    { lang: 'en', file: 'a' },
    { lang: 'pt-BR', file: 'b' },
  ];
  it('takes --lang when the deck has it, else warns and keeps the entry language', () => {
    expect(pickedLanguage(list, undefined, () => {})).toBeNull();
    expect(pickedLanguage(list, 'pt_br', () => {})).toBe('pt-BR');
    const warnings: string[] = [];
    expect(pickedLanguage(list, 'de', (m) => warnings.push(m))).toBeNull();
    expect(warnings).toEqual([
      "--lang de is not one of the deck's languages (en, pt-BR); it starts in en",
    ]);
  });
});

describe('pairSlides', () => {
  const slide = (title: string, frontmatter = {}, line = 1, file = '/deck/slides.md') => ({
    title,
    content: `# ${title}`,
    frontmatter,
    source: { filepath: file, start: line - 1, contentStart: line },
  });
  const names = {
    root: '/deck',
    entry: '/deck/slides.md',
    file: '/deck/slides.tr.md',
    lang: 'tr',
    entryLang: 'en',
  };
  const en = [
    slide('One', { layout: 'cover', title: 'One' }),
    slide('Two', { layout: 'center', routeAlias: 'two' }, 8),
    slide('Three', {}, 14),
  ];

  it('gives each slide the entry slide frontmatter under its own, but not its title', () => {
    const tr = [slide('Bir', { class: 'x' }), slide('İki', { layout: 'end' })];
    const { slides } = pairSlides(en.slice(0, 2), tr, names, () => {});
    expect(slides.map((s: any) => s.frontmatter)).toEqual([
      { layout: 'cover', class: 'x' },
      { layout: 'end', routeAlias: 'two' },
    ]);
    expect(slides[1].title).toBe('İki');
  });
  it('uses the entry slide where the translation has none, and says which', () => {
    const warnings: string[] = [];
    const tr = [slide('Bir')];
    const { slides, fallbacks } = pairSlides(en, tr, names, (m) => warnings.push(m));
    expect(fallbacks).toEqual([1, 2]);
    expect(slides[1]).toBe(en[1]);
    expect(warnings).toEqual([
      'slides.tr.md: tr has 1 slide and slides.md has 3: slide 2 (slides.md:8), slide 3 (slides.md:14) of slides.md have no counterpart in tr, so tr shows the en slide',
    ]);
  });
  it('leaves out slides past the entry file last, and says which', () => {
    const warnings: string[] = [];
    const tr = [
      slide('Bir'),
      slide('İki'),
      slide('Üç'),
      slide('Dört', {}, 20, '/deck/slides.tr.md'),
    ];
    const { slides, fallbacks } = pairSlides(en, tr, names, (m) => warnings.push(m));
    expect(slides.map((s: any) => s.title)).toEqual(['Bir', 'İki', 'Üç']);
    expect(fallbacks).toEqual([]);
    expect(warnings).toEqual([
      'slides.tr.md: tr has 4 slides and slides.md has 3: slide 4 (slides.tr.md:20) of slides.tr.md has no counterpart in slides.md and is left out (slide numbers are the addresses, the same in every language)',
    ]);
  });
  it('says nothing when the files line up', () => {
    const warnings: string[] = [];
    pairSlides(en, [slide('a'), slide('b'), slide('c')], names, (m) => warnings.push(m));
    expect(warnings).toEqual([]);
  });
});

describe('generated sources', () => {
  it('a deck in one language gets empty languages and no import of the switch', () => {
    const text = languagesSource([], '');
    expect(text).toContain('export const LANGUAGES: readonly DeckLanguage[] = [];');
    expect(text).toContain('LANGUAGE_MENU: (() => Promise<Type<unknown>>) | null = null;');
    expect(text).not.toMatch(/^import \{/m); // type-only imports, nothing in the bundle
  });
  it('a deck in several languages picks one at start and loads the menu', () => {
    const text = languagesSource([{ lang: 'en', dir: '', title: 'T' }], 'en');
    expect(text).toContain('export const DEFAULT_LANGUAGE = "en";');
    expect(text).toContain('pickLanguage(LANGUAGES, DEFAULT_LANGUAGE)');
    expect(text).toContain("import('../../app/ui/language-menu')");
  });
  it('index.ts takes every export from the module of the language', () => {
    const text = languageIndexSource(['en', 'pt-BR']);
    expect(text).toContain("import * as L1 from './deck.pt-BR';");
    expect(text).toContain('const DECKS: Record<string, typeof L0> = { "en": L0, "pt-BR": L1 };');
    for (const name of [
      'NOT_FOUND',
      'HEADMATTER',
      'INFO_HTML',
      'DRAWINGS',
      'DOWNLOAD',
      'PWA',
      'SLIDES',
    ])
      expect(text).toContain(`export const ${name} = DECK.${name};`);
  });
  it('the exports of index.ts are those of a deck in one language', () => {
    const single = indexSource({ headmatter: {}, slides: [], entry: ENTRY });
    const names = [...single.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
    const several = languageIndexSource(['en', 'tr']);
    expect([...several.matchAll(/^export const (\w+)/gm)].map((m) => m[1])).toEqual(names);
  });
  it("a translation's index imports its own slides and the entry file's for a fallback", () => {
    const slides = [0, 1].map(() => ({ frontmatter: {}, content: '', title: null }));
    const text = indexSource({
      headmatter: {},
      slides,
      entry: ENTRY,
      lang: 'tr',
      slideFiles: [
        languageSlideFile('slide-001', 'tr', false),
        languageSlideFile('slide-002', 'tr', true),
      ],
    });
    expect(text).toContain("import Slide001 from './slide-001.tr';");
    expect(text).toContain("import Slide002 from './slide-002';");
    expect(text).toContain('GENERATED from the tr slides');
  });
});

describe('deckInLanguage', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'slide-ng-languages-'));
    writeFileSync(
      join(dir, 'slides.md'),
      '---\ntitle: Talk\nexportFilename: talk\nlanguages:\n  en: slides.md\n  tr: slides.tr.md\n---\n\n# One\n\n---\n\n# Two\n',
    );
    writeFileSync(join(dir, 'slides.tr.md'), '---\ntitle: Konuşma\n---\n\n# Bir\n');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reads the file of the language over the entry headmatter, paired with the entry slides', async () => {
    const deck = await parseDeck(join(dir, 'slides.md'));
    const tr = await deckInLanguage(deck, 'tr');
    expect(tr.headmatter).toMatchObject({ title: 'Konuşma', exportFilename: 'talk', lang: 'tr' });
    expect(tr.headmatter.languages).toBeUndefined();
    expect(tr.ownHeadmatter).toEqual({ title: 'Konuşma' });
    expect(tr.slides.map((s: any) => s.title)).toEqual(['Konuşma', 'Two']);
  });
  it('is the deck itself for its own language, another one, or none', async () => {
    const deck = await parseDeck(join(dir, 'slides.md'));
    expect(await deckInLanguage(deck, 'en')).toBe(deck);
    expect(await deckInLanguage(deck, 'de')).toBe(deck);
    expect(await deckInLanguage(deck, undefined)).toBe(deck);
  });
});

describe('languages with a config file', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'slide-ng-languages-config-'));
    writeFileSync(
      join(dir, 'slide-ng.config.yaml'),
      'title: Talk\ninfo: About\ncolorSchema: dark\nlanguages:\n  en: slides.md\n  tr: slides.tr.md\n',
    );
    writeFileSync(join(dir, 'slides.md'), '# One\n\n---\n\n# Two\n');
    writeFileSync(join(dir, 'slides.tr.md'), '---\ntitle: Konuşma\ninfo: Hakkında\n---\n\n# Bir\n');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reads languages from the config file, and gives every language its keys', async () => {
    const deck = await parseDeck(join(dir, 'slides.md'));
    const languages = readLanguages(deck.ownHeadmatter, deck.entry, () => {}, {
      config: deck.config,
    });
    expect(languages?.map((l) => l.lang)).toEqual(['en', 'tr']);
    const tr = await deckInLanguage(deck, 'tr');
    expect(tr.headmatter).toMatchObject({
      title: 'Konuşma',
      info: 'Hakkında',
      colorSchema: 'dark',
      lang: 'tr',
    });
    expect(tr.headmatter.languages).toBeUndefined();
  });
});
