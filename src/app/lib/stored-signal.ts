import { WritableSignal, effect, signal } from '@angular/core';
import { scopedKey } from './deck-scope';

function read<T>(key: string, initial: T): T {
  try {
    const text = localStorage.getItem(key);
    // Merge objects with the default so a value saved by an older version still has every key.
    if (text == null) return initial;
    const value = JSON.parse(text);
    return initial && typeof initial === 'object' && !Array.isArray(initial)
      ? { ...initial, ...value }
      : value;
  } catch {
    return initial; // storage blocked or the text is not JSON: start from the default
  }
}

/**
 * A signal that remembers its value in localStorage (Slidev's useLocalStorage), under `key` of this deck only (deck-scope.ts):
 * two decks on one origin keep their own settings.
 * Call it where Angular allows `effect()`: a constructor or a field initializer.
 */
export function storedSignal<T>(name: string, initial: T): WritableSignal<T> {
  const key = scopedKey(name);
  const value = signal<T>(read(key, initial));
  effect(() => {
    const current = value();
    try {
      localStorage.setItem(key, JSON.stringify(current));
    } catch {
      /* the choice just is not remembered */
    }
  });
  return value;
}
