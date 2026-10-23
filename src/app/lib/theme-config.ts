import { InjectionToken } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';

/** The merged `themeConfig` of the theme, the addons and the deck (Slidev's `$slidev.themeConfigs`), or `{}`. */
export type ThemeConfig = Readonly<Record<string, unknown>>;

/** Reads `themeConfig` from a headmatter; anything but a plain map is `{}`. */
export function readThemeConfig(headmatter: Record<string, unknown>): ThemeConfig {
  const value = headmatter['themeConfig'];
  return Object.freeze(
    value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {},
  );
}

// Strings and numbers are also CSS variables, `--slidev-theme-<key>` (scripts/lib/theme-config.mjs).
export const THEME_CONFIG = new InjectionToken<ThemeConfig>('THEME_CONFIG', {
  providedIn: 'root',
  factory: () => readThemeConfig(HEADMATTER),
});
