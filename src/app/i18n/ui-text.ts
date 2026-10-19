// The interface text in use: English with the deck's translation over it (`locales/<lang>.json`, see docs/UI-STRINGS.md).
// Templates use the `t` pipe (i18n/t.ts); TypeScript uses `Ui.text()` or `uiText()`.
import { InjectionToken } from '@angular/core';
import { EN, UiText, UiTextKey } from './en';

/** Values for the `{name}` placeholders of a text. */
export type UiTextParams = Readonly<Record<string, string | number | null | undefined>>;

/** The merged dictionary. app.config.ts provides the generated one; without it (unit tests) it is English. */
export const UI_TEXT = new InjectionToken<UiText>('UI_TEXT', {
  providedIn: 'root',
  factory: () => EN,
});

/** English with `translations` over it, key by key. Keys English does not have are left out. */
export function mergeUiText(translations: Readonly<Record<string, string>>): UiText {
  const merged: Record<string, string> = { ...EN };
  for (const [key, value] of Object.entries(translations))
    if (key in EN && typeof value === 'string') merged[key] = value;
  return merged as UiText;
}

/** Puts the values into `{name}` placeholders. A placeholder without a value stays as it is. */
export function fillPlaceholders(text: string, params?: UiTextParams): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (all, name: string) =>
    params[name] == null ? all : String(params[name]),
  );
}

/** One text of `dictionary`, with its placeholders filled. An unknown key comes back as it is. */
export function uiText(dictionary: UiText, key: UiTextKey, params?: UiTextParams): string {
  return fillPlaceholders(dictionary[key] ?? key, params);
}

/**
 * A text with one placeholder that is drawn as markup (a bold name, a key): the parts before and after it.
 * `Made with {name}, inspired by Slidev` -> ['Made with ', ', inspired by Slidev'].
 */
export function splitAt(text: string, placeholder: string): [string, string] {
  const at = text.indexOf(`{${placeholder}}`);
  return at < 0 ? [text, ''] : [text.slice(0, at), text.slice(at + placeholder.length + 2)];
}
