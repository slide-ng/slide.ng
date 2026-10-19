import { describe, expect, it } from 'vitest';
import { themeConfigCss, themeConfigVars, unsafeCssValue } from './theme-config.mjs';
import { themeCss } from './theme-files.mjs';

describe('themeConfigVars', () => {
  it('names each key --slidev-theme-<key>, as Slidev does', () => {
    expect(themeConfigVars({ primary: '#213435', radius: 4, accentDark: 'teal' }).vars).toEqual([
      ['--slidev-theme-primary', '#213435'],
      ['--slidev-theme-radius', '4'],
      ['--slidev-theme-accentDark', 'teal'],
    ]);
  });
  it('is empty without themeConfig', () => {
    expect(themeConfigVars(undefined)).toEqual({ vars: [], problems: [] });
  });
  it('leaves lists, maps and booleans to THEME_CONFIG without a warning', () => {
    expect(themeConfigVars({ list: [1], map: { a: 1 }, on: true, none: null })).toEqual({
      vars: [],
      problems: [],
    });
  });
  it('says when themeConfig is not a map', () => {
    expect(themeConfigVars('blue').problems).toEqual([
      'themeConfig must be a map of keys and values; ignored',
    ]);
  });
  it('skips a key that is not a plain word', () => {
    const { vars, problems } = themeConfigVars({ 'a b': 'red', 'x:y': 'red', ok: 'red' });
    expect(vars).toEqual([['--slidev-theme-ok', 'red']]);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('themeConfig.a b');
  });
  it('keeps values that are ordinary CSS', () => {
    for (const value of [
      '#fff',
      'rgb(0 0 0 / 50%)',
      "'Inter', sans-serif",
      'url("a.png")',
      'calc(1rem + 2px)',
      'var(--x, [a])',
    ])
      expect(unsafeCssValue(value), value).toBeNull();
  });
  it('skips values that could leave the declaration, with the key in the warning', () => {
    const bad = {
      semicolon: 'red; color: blue',
      brace: 'red } body { color: blue',
      open: 'red { x',
      tag: '</style><script>',
      comment: 'red /* x',
      commentEnd: 'red */',
      newline: 'red\ncolor: blue',
      carriage: 'red\rx',
      backslash: 'red\\',
      quote: '"red',
      paren: 'url(a.png',
      closer: 'a) b',
      empty: '  ',
    };
    const { vars, problems } = themeConfigVars(bad);
    expect(vars).toEqual([]);
    expect(problems).toHaveLength(Object.keys(bad).length);
    expect(problems[0]).toMatch(/^themeConfig\.semicolon is not set as a CSS variable: /);
  });
});

describe('themeConfigCss', () => {
  it('writes the variables on body, one per line', () => {
    expect(themeConfigCss({ primary: ' #5d8392 ', size: 2 })).toBe(
      'body {\n  --slidev-theme-primary: #5d8392;\n  --slidev-theme-size: 2;\n}\n',
    );
  });
  it('is empty when nothing can be written', () => {
    expect(themeConfigCss({ bad: 'a;b' })).toBe('');
    expect(themeConfigCss(undefined)).toBe('');
  });
  it('comes after the font rules in theme.css, and only the font @import stays first', () => {
    const css = themeCss([], { fonts: { sans: 'Robot' }, themeConfig: { primary: 'red' } });
    expect(css.startsWith('@import url(')).toBe(true);
    expect(css.trimEnd().endsWith('body {\n  --slidev-theme-primary: red;\n}')).toBe(true);
  });
});
