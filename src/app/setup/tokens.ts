// What the browser side setup files (docs/SETUP.md) fill in. Nothing here runs unless a root has the file.
import { InjectionToken } from '@angular/core';
import type { Routes } from '@angular/router';

/** One entry of the right-click menu. `run` is what a click does. */
export interface ContextMenuItem {
  icon: string;
  label: string;
  run: () => void;
  disabled?: boolean;
}

/** `setup/context-menu.ts`: gets the entries and returns the ones to show. */
export type ContextMenuSetup = (items: ContextMenuItem[]) => ContextMenuItem[];
export const CONTEXT_MENU_SETUP = new InjectionToken<ContextMenuSetup>('CONTEXT_MENU_SETUP', {
  factory: () => (items) => items,
});

/** `setup/mermaid.ts`: returns Mermaid's config. A diagram's own options come after it. */
export type MermaidSetup = () => Record<string, unknown>;
export const MERMAID_SETUP = new InjectionToken<MermaidSetup[]>('MERMAID_SETUP', {
  factory: () => [],
});

/** `setup/mermaid-renderer.ts`: returns a function that draws Mermaid code as an SVG string, or nothing to keep Mermaid.
 * The function gets the code and the diagram's options (theme, `setup/mermaid.ts` config, the fence's own options). */
export type MermaidRenderer = (
  code: string,
  options: Record<string, unknown>,
) => string | Promise<string>;
export type MermaidRendererSetup = () =>
  MermaidRenderer | null | undefined | Promise<MermaidRenderer | null | undefined>;
export const MERMAID_RENDERER = new InjectionToken<MermaidRendererSetup[]>('MERMAID_RENDERER', {
  factory: () => [],
});

/** `setup/routes.ts`: gets the routes and returns the routes to use. The `:no` and `**` routes are kept last. */
export type RoutesSetup = (routes: Routes) => Routes;
export const ROUTES_SETUP = new InjectionToken<RoutesSetup[]>('ROUTES_SETUP', {
  factory: () => [],
});

/** `setup/monaco.ts`: runs once Monaco is loaded, gets `monaco`, may return editor options for every editor. */
export type MonacoSetup = (
  monaco: typeof import('monaco-editor'),
) => Record<string, unknown> | void | Promise<Record<string, unknown> | void>;
export const MONACO_SETUP = new InjectionToken<MonacoSetup[]>('MONACO_SETUP', {
  factory: () => [],
});
