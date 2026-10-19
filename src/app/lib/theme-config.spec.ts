import { readThemeConfig } from './theme-config';

describe('readThemeConfig', () => {
  it('returns the themeConfig map, frozen', () => {
    const config = readThemeConfig({ themeConfig: { primary: '#213435', sizes: [1, 2] } });
    expect(config).toEqual({ primary: '#213435', sizes: [1, 2] });
    expect(Object.isFrozen(config)).toBe(true);
  });
  it('is empty without a map', () => {
    expect(readThemeConfig({})).toEqual({});
    expect(readThemeConfig({ themeConfig: 'blue' })).toEqual({});
    expect(readThemeConfig({ themeConfig: ['a'] })).toEqual({});
  });
});
