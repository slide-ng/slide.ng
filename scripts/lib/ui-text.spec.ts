// @vitest-environment node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN } from '../../src/app/i18n/en';
import {
  BUILT_IN_LOCALES,
  checkTranslation,
  localeFiles,
  readEnglish,
  readTranslations,
  uiTextSource,
} from './ui-text.mjs';

// Every `locales/*.json` of the repository: the built-in translations, the example theme, the scaffold and the test decks.
const localeJsonFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name === 'node_modules' || e.name.startsWith('.')) return [];
    const path = join(dir, e.name);
    if (e.isDirectory()) return localeJsonFiles(path);
    return /[\\/]locales$/.test(dir) && e.name.endsWith('.json') ? [path] : [];
  });

describe('translations', () => {
  it('every locales/*.json of the repository matches en.ts: known keys, the same placeholders', () => {
    const files = ['src', 'examples', 'template', 'tests'].flatMap(localeJsonFiles);
    expect(files).toContain(join(BUILT_IN_LOCALES, 'locales', 'tr.json'));
    const problems = files.flatMap((f) =>
      checkTranslation(EN, JSON.parse(readFileSync(f, 'utf8'))).map((p) => `${f}: ${p}`),
    );
    expect(problems).toEqual([]);
  });

  it('a built-in translation is complete', () => {
    for (const file of readdirSync(join(BUILT_IN_LOCALES, 'locales'))) {
      const data = JSON.parse(readFileSync(join(BUILT_IN_LOCALES, 'locales', file), 'utf8'));
      expect(
        Object.keys(EN).filter((k) => !(k in data)),
        file,
      ).toEqual([]);
    }
  });

  it('names unknown keys, values that are not text and lost or added placeholders', () => {
    expect(
      checkTranslation(EN, {
        'nav.next': 'Sonraki',
        'nav.nope': 'x',
        'nav.prev': 3,
        'presenter.noNotes': 'Not yok.',
        'nav.info': 'Bilgi {x}',
      }),
    ).toEqual([
      '"nav.nope" is not a key of the interface',
      '"nav.prev" should be text',
      '"presenter.noNotes" should have {no}',
      '"nav.info" should have no placeholders',
    ]);
    expect(checkTranslation(EN, ['x'])).toEqual(['should be an object of "key": "text" pairs']);
  });

  it('docs/UI-STRINGS.md lists every key', () => {
    const docs = readFileSync('docs/UI-STRINGS.md', 'utf8');
    const listed = new Set([...docs.matchAll(/^\| `([\w.]+)` +\|/gm)].map((m) => m[1]));
    expect(Object.keys(EN).filter((k) => !listed.has(k))).toEqual([]);
  });

  it('reads English from en.ts as the app does', async () => {
    expect(await readEnglish()).toEqual(EN);
  });
});

describe('locale files', () => {
  it('finds the language, then the region, in each root; later roots win key by key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ui-text-'));
    try {
      const put = (root: string, name: string, data: object) => {
        mkdirSync(join(dir, root, 'locales'), { recursive: true });
        writeFileSync(join(dir, root, 'locales', name), JSON.stringify(data));
      };
      put('theme', 'pt.json', { 'nav.next': 'Próximo', 'nav.prev': 'Anterior' });
      put('theme', 'pt-BR.json', { 'nav.prev': 'Voltar' });
      put('deck', 'pt.json', { 'nav.next': 'Seguinte', 'nav.bad': 'x' });
      const files = localeFiles([join(dir, 'theme'), join(dir, 'deck')], 'pt-BR');
      expect(files.map((f: string) => f.slice(dir.length + 1))).toEqual([
        join('theme', 'locales', 'pt.json'),
        join('theme', 'locales', 'pt-BR.json'),
        join('deck', 'locales', 'pt.json'),
      ]);
      const warnings: string[] = [];
      expect(readTranslations(files, EN, (m: string) => warnings.push(m))).toEqual({
        'nav.next': 'Seguinte',
        'nav.prev': 'Voltar',
      });
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('"nav.bad" is not a key');
      expect(localeFiles([join(dir, 'theme')], 'fr')).toEqual([]);
      put('deck', 'zh-Hans.json', { 'nav.next': '下一页' });
      expect(
        localeFiles([join(dir, 'deck')], 'zh-Hans-CN').map((f: string) => f.slice(dir.length + 1)),
      ).toEqual([join('deck', 'locales', 'zh-Hans.json')]);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('stops at a file that is not JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ui-text-'));
    try {
      writeFileSync(join(dir, 'tr.json'), '{ "nav.next": ');
      expect(() => readTranslations([join(dir, 'tr.json')], EN, () => {})).toThrow(
        /not valid JSON/,
      );
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('uiTextSource', () => {
  it('registers the data of a locale other than en-US and lists the translations', () => {
    const tr = uiTextSource({ locale: 'tr', translations: { 'nav.next': 'Sonraki' } });
    expect(tr).toContain("import data from '@angular/common/locales/tr';");
    expect(tr).toContain('registerLocaleData(data);');
    expect(tr).toContain('export const LOCALE = "tr";');
    expect(tr).toContain('"nav.next": "Sonraki"');
    const en = uiTextSource({ locale: 'en-US', translations: {} });
    expect(en).not.toContain('registerLocaleData');
    expect(existsSync('node_modules/@angular/common/locales/tr.js')).toBe(true);
  });
});
