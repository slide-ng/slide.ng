import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { findRenderer } from '../code/mermaid';
import { CODE_RUNNERS } from '../code/runners';
import {
  SHORTCUTS_FILES,
  SHORTCUTS_SETUP,
  Shortcut,
  ShortcutActions,
  resolveShortcuts,
} from '../lib/shortcuts';
import {
  CONTEXT_MENU_SETUP,
  ContextMenuItem,
  MERMAID_RENDERER,
  MERMAID_SETUP,
  ROUTES_SETUP,
  applyRoutesSetups,
  codeRunnerProviders,
  contextMenuProviders,
  mainProviders,
  mermaidProviders,
  mermaidRendererProviders,
  rootProviders,
  routesProviders,
  shortcutsProviders,
} from './index';

const none = {} as ShortcutActions;
const key = (name: string): Shortcut => ({ name, key: name, run: () => {} });

describe('setup providers', () => {
  it('chains shortcut setups, each getting the list so far', () => {
    TestBed.configureTestingModule({
      providers: shortcutsProviders([
        (_a, list) => [...list, key('a')],
        (_a, list) => list.filter((s) => s.name !== 'x').concat(key('b')),
      ]),
    });
    const result = TestBed.inject(SHORTCUTS_FILES).reduce(
      (all, f) => f(none, all),
      [key('x'), key('y')],
    );
    expect(result.map((s) => s.name)).toEqual(['y', 'a', 'b']);
  });

  it("adds the setup files to a theme's SHORTCUTS_SETUP instead of replacing it", () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SHORTCUTS_SETUP,
          useValue: (_a: ShortcutActions, l: Shortcut[]) => [...l, key('theme')],
        },
        ...shortcutsProviders([(_a, list) => [...list, key('deck')]]),
      ],
    });
    const names = TestBed.runInInjectionContext(() => resolveShortcuts(none)).map((s) => s.name);
    expect(names.slice(-2)).toEqual(['theme', 'deck']);
  });

  it('chains context menu setups', () => {
    TestBed.configureTestingModule({
      providers: contextMenuProviders([
        (items) => [...items, { icon: 'i', label: 'one', run: () => {} }],
        (items) => items.slice().reverse(),
      ]),
    });
    const base: ContextMenuItem[] = [{ icon: 'i', label: 'zero', run: () => {} }];
    expect(TestBed.inject(CONTEXT_MENU_SETUP)(base).map((i) => i.label)).toEqual(['one', 'zero']);
  });

  it('keeps the mermaid setups in order, for the diagram to merge', () => {
    TestBed.configureTestingModule({
      providers: mermaidProviders([() => ({ a: 1 }), () => ({ b: 2 })]),
    });
    expect(Object.assign({}, ...TestBed.inject(MERMAID_SETUP).map((f) => f()))).toEqual({
      a: 1,
      b: 2,
    });
  });

  it('provides one code runner map per file', () => {
    TestBed.configureTestingModule({
      providers: codeRunnerProviders([
        () => ({ python: async () => ({ lines: [['1']] }) }),
        () => ({ lua: async () => ({ lines: [] }) }),
      ]),
    });
    const maps = TestBed.inject(CODE_RUNNERS);
    expect(maps.map((m) => Object.keys(m))).toEqual([['python'], ['lua']]);
  });

  it('runs a root setup once, where inject() works', () => {
    let ran = 0;
    TestBed.configureTestingModule({
      providers: rootProviders([
        () => {
          ran++;
        },
      ]),
    });
    TestBed.inject(SHORTCUTS_SETUP);
    expect(ran).toBe(1);
  });

  it('flattens the providers of main setups', () => {
    const a = { provide: 'A', useValue: 1 };
    const b = { provide: 'B', useValue: 2 };
    expect(mainProviders([() => [a], () => [b]])).toEqual([a, b]);
  });

  it('uses the renderer of the last root that gives one, and asks each file once', async () => {
    let asked = 0;
    const theme = () => (code: string) => `<svg>theme ${code}</svg>`;
    const deck = async () => {
      asked++;
      return undefined; // the deck's file decides not to replace the renderer
    };
    TestBed.configureTestingModule({ providers: mermaidRendererProviders([theme, deck]) });
    const setups = TestBed.inject(MERMAID_RENDERER);
    const renderer = await findRenderer(setups);
    expect(await renderer?.('A', {})).toBe('<svg>theme A</svg>');
    await findRenderer(setups);
    expect(asked).toBe(1);
    expect(await findRenderer([])).toBeNull();
  });

  it('chains route setups and keeps the routes that match any address last', () => {
    @Component({ template: '' })
    class Page {}
    TestBed.configureTestingModule({
      providers: routesProviders([
        (routes) => [...routes, { path: 'one', component: Page }],
        (routes) => [...routes.filter((r) => r.path !== 'notes'), { path: 'two', component: Page }],
      ]),
    });
    const base = [
      { path: 'notes', component: Page },
      { path: ':no', component: Page },
      { path: '**', redirectTo: '1' },
    ];
    const paths = applyRoutesSetups(base, TestBed.inject(ROUTES_SETUP)).map((r) => r.path);
    expect(paths).toEqual(['one', 'two', ':no', '**']);
    expect(applyRoutesSetups(base, []).map((r) => r.path)).toEqual(['notes', ':no', '**']);
  });
});
