---
name: setup-overview
description: The setup/ folder - which hooks exist, where they run and how roots combine
---

# Setup files

A `setup/` folder next to `slides.md` (or in a theme or addon) changes how code, math and diagrams are drawn, which keys and menu entries exist, and how the markdown is read. One file per job; each default-exports a **plain function** (no `define...Setup` helper). Every root may have the same file; roots run weakest first and the deck has the last word.

- **Node hooks** run while slides are generated: `shiki`, `katex`, `transformers`, `preparser`. They are bundled with esbuild, so they can be TypeScript and import packages. An error names the root and the file.
- **Browser hooks** become part of the Angular app and must be `.ts`: `main`, `root`, `routes`, `shortcuts`, `context-menu`, `mermaid`, `mermaid-renderer`, `monaco`, `code-runners`. Types come from `slide-ng/...` (`import type { ... } from 'slide-ng/lib/shortcuts'`).

| file                        | runs              | function receives                | returns                   |
| --------------------------- | ----------------- | -------------------------------- | ------------------------- |
| `setup/shiki.ts`            | generating        | `{}`                             | Shiki options             |
| `setup/katex.ts`            | generating        | nothing                          | KaTeX options             |
| `setup/transformers.ts`     | generating        | nothing                          | `{ pre, codeblocks }`     |
| `setup/preparser.ts`        | generating        | `{ filepath, headmatter, mode }` | list of parser extensions |
| `setup/mermaid.ts`          | browser           | nothing                          | Mermaid config            |
| `setup/mermaid-renderer.ts` | browser           | nothing                          | `(code, options) => svg`  |
| `setup/monaco.ts`           | browser           | `monaco`                         | editor options            |
| `setup/code-runners.ts`     | browser           | nothing                          | `{ language: run }`       |
| `setup/shortcuts.ts`        | browser           | `(actions, list)`                | the list of shortcuts     |
| `setup/context-menu.ts`     | browser           | `items`                          | the list of entries       |
| `setup/main.ts`             | browser, at start | nothing                          | Angular providers         |
| `setup/root.ts`             | browser, at start | nothing                          | nothing                   |
| `setup/routes.ts`           | browser, at start | the routes                       | the routes to use         |
| `setup/providers.ts`        | browser, at start | (older way)                      | array of providers        |

Not available: `setup/vite.config.ts`, `setup/vue.ts`, a run context for code runners, `monacoTypesSource`, markdown-it plugins.

Each hook has its own reference: `setup-shiki.md`, `setup-katex.md`, `setup-transformers.md`, `setup-preparser.md`, `setup-mermaid.md` (with the renderer), `setup-monaco.md`, `setup-code-runners.md`, `setup-shortcuts.md`, `setup-context-menu.md`, `setup-main-root.md`, `setup-routes.md`.
