// @vitest-environment node
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONFIG_FILES, configFiles, configKeyPlace, readDeckConfig } from './deck-config.mjs';

const YAML = '/deck/slide-ng.config.yaml';
const JSON_FILE = '/deck/slide-ng.config.json';
const read = (files: Record<string, string>) => readDeckConfig('/deck', files);

describe('readDeckConfig', () => {
  it('is null without a config file', () => {
    expect(read({})).toBeNull();
  });
  it('reads the YAML file as headmatter keys, with the line of each', () => {
    const config = read({ [YAML]: '# the deck\ntitle: My talk\nfonts:\n  sans: Inter\n' });
    expect(config?.file).toBe(YAML);
    expect(config?.headmatter).toEqual({ title: 'My talk', fonts: { sans: 'Inter' } });
    expect({ ...config?.lines }).toEqual({ title: 2, fonts: 3 });
    expect(config?.problems).toEqual([]);
    expect(configKeyPlace(config, 'fonts')).toBe(`${YAML}:3`);
    expect(configKeyPlace(config, 'theme')).toBeNull();
  });
  it('reads .yml and .json too', () => {
    expect(read({ '/deck/slide-ng.config.yml': 'title: T\n' })?.headmatter).toEqual({ title: 'T' });
    const config = read({ [JSON_FILE]: '{\n  "title": "T",\n  "lang": "tr"\n}\n' });
    expect(config?.headmatter).toEqual({ title: 'T', lang: 'tr' });
    expect({ ...config?.lines }).toEqual({ title: 2, lang: 3 });
  });
  it('takes an empty file as no keys', () => {
    expect(read({ [YAML]: '# nothing yet\n' })?.headmatter).toEqual({});
    expect(read({ [JSON_FILE]: '' })?.headmatter).toEqual({});
  });
  it('reads the first of the names and warns about the others', () => {
    const config = read({ [YAML]: 'title: A\n', [JSON_FILE]: '{ "title": "B" }' });
    expect(config?.headmatter).toEqual({ title: 'A' });
    expect(config?.problems).toEqual([
      `${JSON_FILE}: not read, as slide-ng.config.yaml is there too; keep one config file`,
    ]);
  });
  it('leaves out the keys of the first slide, with the file and line', () => {
    const config = read({ [YAML]: 'title: T\nlayout: center\nclass: big\n' });
    expect(config?.headmatter).toEqual({ title: 'T' });
    expect(config?.problems).toEqual([
      expect.stringMatching(
        /^\/deck\/slide-ng\.config\.yaml:2: `layout` belongs to the first slide/,
      ),
      expect.stringMatching(
        /^\/deck\/slide-ng\.config\.yaml:3: `class` belongs to the first slide/,
      ),
    ]);
  });
  it('stops at a file that is not valid YAML, with its line', () => {
    expect(() => read({ [YAML]: 'title: ok\nfonts: [Inter\n' })).toThrow(
      `${YAML}:2: the config file is not valid YAML: a [ is not closed`,
    );
    expect(() => read({ [YAML]: 'title: Part 2: the plan\n' })).toThrow(
      `${YAML}:1: the config file is not valid YAML: the value of "title" has ": " in it`,
    );
    expect(() => read({ [YAML]: 'title: T\ntitle: U\n' })).toThrow(
      `${YAML}:2: the config file is not valid YAML: "title" is set twice`,
    );
    expect(() => read({ [YAML]: 'title: T\njust words\n' })).toThrow(
      `${YAML}:2: the config file is not valid YAML: "just words" is not a "key: value" line`,
    );
  });
  it('stops at a file that is not valid JSON, with its line', () => {
    expect(() => read({ [JSON_FILE]: '{\n  "title": "T",\n}\n' })).toThrow(
      new RegExp(`^${JSON_FILE}:3: the config file is not valid JSON: `),
    );
  });
  it('stops at a file that is not a map of keys', () => {
    expect(() => read({ [YAML]: '- title\n- lang\n' })).toThrow(
      `${YAML}: the config file should hold the deck's options as keys`,
    );
    expect(() => read({ [JSON_FILE]: '"title"' })).toThrow('should hold the deck');
  });
  it('lists the names it looks for in the folder', () => {
    expect(configFiles('/deck')).toEqual(CONFIG_FILES.map((n) => `/deck/${n}`));
  });
});

describe('readDeckConfig on disk', () => {
  const base = mkdtempSync(join(tmpdir(), 'slideng-config-'));
  it('reads the file of the folder', () => {
    const dir = join(base, 'deck');
    mkdirSync(dir);
    writeFileSync(join(dir, 'slide-ng.config.yml'), 'title: On disk\n');
    expect(readDeckConfig(dir)?.headmatter).toEqual({ title: 'On disk' });
  });
  it('refuses a config file that is a link to a file outside the folder', () => {
    const dir = join(base, 'linked');
    mkdirSync(dir);
    writeFileSync(join(base, 'shared.yaml'), 'allowOutsideRoot: true\n');
    symlinkSync(join(base, 'shared.yaml'), join(dir, 'slide-ng.config.yaml'));
    expect(() => readDeckConfig(dir)).toThrow("leads outside the deck's folder");
  });
});
