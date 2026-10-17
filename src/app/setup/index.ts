// Turns the `setup/*.ts` files of the roots into Angular providers. `generated/setup.ts` calls these with the files it found
// (weakest root first: built-in theme, `theme:`, addons, the deck).
import { EnvironmentProviders, Provider, provideEnvironmentInitializer } from '@angular/core';
import { CODE_RUNNERS, CodeRunnerFn } from '../code/runners';
import type { Shortcut, ShortcutActions } from '../lib/shortcuts';
import { SHORTCUTS_FILES } from '../lib/shortcuts';
import {
  CONTEXT_MENU_SETUP,
  ContextMenuSetup,
  MERMAID_SETUP,
  MONACO_SETUP,
  MermaidSetup,
  MonacoSetup,
} from './tokens';

export * from './tokens';

type Providers = (Provider | EnvironmentProviders)[];

/** `setup/main.ts`: each returns Angular providers. */
export const mainProviders = (files: (() => Providers)[]): Providers => files.flatMap((f) => f());

/** `setup/root.ts`: each runs once when the app starts, in an injection context (so `inject()` works). */
export const rootProviders = (files: (() => void)[]): Providers =>
  files.map((f) => provideEnvironmentInitializer(f));

/** `setup/shortcuts.ts`: each gets the actions and the list so far, and returns the list to use. They run after a
 * SHORTCUTS_SETUP provider (`setup/providers.ts` of a theme), so a deck's file adds to the theme's keys. */
export const shortcutsProviders = (
  files: ((actions: ShortcutActions, list: Shortcut[]) => Shortcut[])[],
): Providers => [{ provide: SHORTCUTS_FILES, useValue: files }];

/** `setup/context-menu.ts`: each gets the entries so far and returns the list to use. */
export const contextMenuProviders = (files: ContextMenuSetup[]): Providers => [
  {
    provide: CONTEXT_MENU_SETUP,
    useValue: ((items) => files.reduce((all, f) => f(all), items)) as ContextMenuSetup,
  },
];

export const mermaidProviders = (files: MermaidSetup[]): Providers => [
  { provide: MERMAID_SETUP, useValue: files },
];
export const monacoProviders = (files: MonacoSetup[]): Providers => [
  { provide: MONACO_SETUP, useValue: files },
];

/** `setup/code-runners.ts`: each returns `{ language: run }`. */
export const codeRunnerProviders = (files: (() => Record<string, CodeRunnerFn>)[]): Providers =>
  files.map((f) => ({ provide: CODE_RUNNERS, multi: true, useFactory: () => f() }));
