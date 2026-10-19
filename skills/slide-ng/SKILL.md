---
name: slide-ng
description: Create, edit, check and present slide decks written in markdown with Angular templates using slide.ng, a Slidev port for Angular. Use when a project has a slides.md for slide.ng, when asked to build a talk, presentation or slide deck with the slide-ng command, or when converting Slidev habits (Vue syntax) to slide.ng (Angular syntax).
---

# slide.ng - markdown slides with Angular templates

Slides are written in one markdown file (`slides.md`). Each slide becomes a standalone Angular component, compiled ahead of time. The file format, layouts, frontmatter and click directives follow Slidev; everything that was Vue is Angular here.

## When to Use

- A project contains a `slides.md` that is built with `slide-ng`, or the task is to make a talk, deck or presentation with slide.ng.
- Slides need live code, Shiki highlighting, Monaco editors, math, Mermaid or PlantUML, click animations, presenter notes, drawing, or export to PDF, PNG, PPTX or Markdown.
- A deck must work offline (an offline folder, a PWA or a PDF).
- Somebody asks for Slidev features or Vue syntax in a slide.ng deck: read `references/core-slidev-differences.md` and `references/not-supported.md` first.
- A whole Slidev deck (Vue components, global layers, styles) is to be ported: follow `references/port-a-slidev-deck.md`.

## Quick Start

```bash
slide-ng create my-deck      # new folder: slides.md, package.json, README.md
cd my-deck && npm install
npm run dev                  # slide-ng dev, http://localhost:4230 (not 3030)
npm run build                # slide-ng build: static site in ./dist
npm run export               # slide-ng export: PDF (needs Chromium: CHROME_PATH)
slide-ng build --offline     # a folder that opens from disk, no server
slide-ng format              # tidy slides.md
slide-ng skills install      # copy this skill into .agents/skills/slide-ng
```

If `slide-ng` is not on the PATH, use `node <slide.ng checkout>/bin/slide-ng.mjs ...`.

**Verify** each step:

| command                    | check                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `slide-ng create my-deck`  | prints `Created ...`; `my-deck/slides.md` exists                                                                                          |
| `slide-ng dev`             | `http://localhost:4230/1` answers; the terminal has no `[slides]` warning (unknown layout, unknown code language, missing slot)           |
| `slide-ng build`           | last line `Built N slides into dist`; `dist/index.html` exists. A template mistake fails here with the generated slide name (`slide-007`) |
| `slide-ng build --offline` | prints `Offline folder: ...`; open `dist/index.html` with no server                                                                       |
| `slide-ng export`          | prints `Exported to <file>`; the file exists. Without Chromium it fails: set `CHROME_PATH`                                                |
| `slide-ng format`          | prints `formatted` or `already formatted`                                                                                                 |
| `slide-ng mcp`             | stderr says `slide-ng mcp: serving <path>`                                                                                                |

Always run `slide-ng build` after editing a deck: Angular compiles every slide, so it catches unknown tags and bad bindings that the dev server may only show in the browser.

## Basic Syntax

<!-- verify -->

```md
---
title: My talk
theme: default
---

# First slide

Count is {{ 1 + 2 }}.

<div slide-ng-click>Appears on the first click</div>

<!-- Speaker notes go in the last HTML comment -->

---
layout: two-cols
---

# Left

::right::

# Right

@if (1 + 1 === 2) {
Angular control flow works.
}
```

- `---` on its own line separates slides; a YAML block after it is that slide's **frontmatter**; the first one is the **headmatter** (deck settings).
- The last HTML comment of a slide is its speaker note.
- `{{ }}`, `@if`, `@for`, `@let`, `[prop]="x"`, `(event)="y"`, `#ref` are Angular template syntax. **Not Vue**: no `v-if`, `v-for`, `:prop`, `@click`, `<script setup>`.
- Tags are lower-case with dashes: `<slide-ng-toc />`, `<slide-ng-link to="3">`. Your own components are Angular standalone components in `components/*.ts`.
- Use UnoCSS (Tailwind-like) classes in `class=` and `class:`.

## Rules for agents

1. Do not invent Slidev or Vue features. Look in the tables below; if a feature is not there, read `references/not-supported.md`.
2. `slide-ng-click` is an attribute (`<div slide-ng-click>`), never the tag `<slide-ng-click>`. Use `slide-ng-click-hide`, not `slide-ng-click.hide`.
3. Put `@if`, `@for`, `@let` and their closing `}` on their own lines. Leave blank lines around markdown lists inside component tags.
4. Add a component by creating `components/<name>.ts` next to `slides.md` (selector string literal, then `export class`); never edit `scripts/lib/registry.mjs` for a deck.
5. Keep the dev server's output clean of `[slides]` warnings, then run `slide-ng build`.
6. `export` needs a local Chromium and never downloads one.
7. The code samples in these references were built with the real generator; copy them as a starting point.

## Core References

| Topic               | Description                                             | Reference                                                        |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| Slidev differences  | Vue habits that fail and the slide.ng way               | [core-slidev-differences](references/core-slidev-differences.md) |
| Port a Slidev deck  | Recipe, Vue to Angular example, pitfalls                | [port-a-slidev-deck](references/port-a-slidev-deck.md)           |
| Angular syntax      | Template syntax in markdown, converter rules            | [core-angular-syntax](references/core-angular-syntax.md)         |
| Syntax              | Separators, frontmatter, notes                          | [core-syntax](references/core-syntax.md)                         |
| Headmatter          | Deck-wide keys                                          | [core-headmatter](references/core-headmatter.md)                 |
| Frontmatter         | Per-slide keys                                          | [core-frontmatter](references/core-frontmatter.md)               |
| CLI                 | Commands, flags, checks                                 | [core-cli](references/core-cli.md)                               |
| Built-in components | Tags available everywhere                               | [core-components](references/core-components.md)                 |
| Own components      | `components/*.ts` standalone components                 | [core-custom-components](references/core-custom-components.md)   |
| Deck state          | `Nav`, `ClicksContext`, `SLIDE_NO` instead of `$slidev` | [core-injection](references/core-injection.md)                   |
| Importing slides    | `src:`, `defaults`                                      | [core-import-slides](references/core-import-slides.md)           |
| Icons               | Iconify tags and classes                                | [core-icons](references/core-icons.md)                           |
| Styling             | UnoCSS, scoped `<style>`, dark mode                     | [core-styling](references/core-styling.md)                       |
| Markdown extras     | Alerts, task lists, footnotes                           | [core-markdown-extras](references/core-markdown-extras.md)       |
| Fonts               | Web fonts, self-hosting                                 | [core-fonts](references/core-fonts.md)                           |
| Keys and UI         | Shortcuts, bar, URL state                               | [core-ui-shortcuts](references/core-ui-shortcuts.md)             |

## Layouts

| Feature          | Description                       | Reference                                                  |
| ---------------- | --------------------------------- | ---------------------------------------------------------- |
| Built-in layouts | 21 layouts and props              | [layout-builtin](references/layout-builtin.md)             |
| Slots            | `::right::`                       | [layout-slots](references/layout-slots.md)                 |
| Custom layouts   | `layouts/*.ts`                    | [layout-custom](references/layout-custom.md)               |
| Canvas size      | `canvasWidth`, `aspectRatio`      | [layout-canvas-size](references/layout-canvas-size.md)     |
| Zoom             | `zoom`                            | [layout-zoom](references/layout-zoom.md)                   |
| Transform        | `<slide-ng-transform>`            | [layout-transform](references/layout-transform.md)         |
| Draggable        | `slide-ng-drag`                   | [layout-draggable](references/layout-draggable.md)         |
| Layers           | `global-top`, `slide-bottom`, ... | [layout-global-layers](references/layout-global-layers.md) |

## Animation

| Feature       | Description                                                      | Reference                                                      |
| ------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Clicks        | `slide-ng-click`, `slide-ng-after`, `slide-ng-click-hide`        | [animation-clicks](references/animation-clicks.md)             |
| Click lists   | `<slide-ng-clicks>`, `<slide-ng-switch>`, `<slide-ng-click-gap>` | [animation-click-lists](references/animation-click-lists.md)   |
| Click markers | `[click]` in notes                                               | [animation-click-marker](references/animation-click-marker.md) |
| Transitions   | `slide-left`, `fade`, `view-transition`                          | [animation-transitions](references/animation-transitions.md)   |
| Marks         | `slide-ng-mark`                                                  | [animation-marks](references/animation-marks.md)               |
| Motion        | `slide-ng-motion`                                                | [animation-motion](references/animation-motion.md)             |
| Drawing       | pen toolbar, `drawings`                                          | [animation-drawing](references/animation-drawing.md)           |

## Code

| Feature         | Description                 | Reference                                                      |
| --------------- | --------------------------- | -------------------------------------------------------------- |
| Code blocks     | fences, titles, themes      | [code-highlighting](references/code-highlighting.md)           |
| Line highlights | `{2,3\|5\|all}`             | [code-line-highlighting](references/code-line-highlighting.md) |
| Line numbers    | `{lines:true}`              | [code-line-numbers](references/code-line-numbers.md)           |
| Max height      | `{maxHeight:'100px'}`       | [code-max-height](references/code-max-height.md)               |
| Snippets        | `<<< ./file.ts#region`      | [code-import-snippet](references/code-import-snippet.md)       |
| Code groups     | `::code-group`              | [code-groups](references/code-groups.md)                       |
| Magic Move      | animated code steps         | [code-magic-move](references/code-magic-move.md)               |
| Twoslash        | type popups                 | [code-twoslash](references/code-twoslash.md)                   |
| Monaco          | `{monaco}`, `{monaco-diff}` | [code-monaco](references/code-monaco.md)                       |
| Monaco run      | `{monaco-run}`              | [code-monaco-run](references/code-monaco-run.md)               |
| Monaco write    | `{monaco-write}`            | [code-monaco-write](references/code-monaco-write.md)           |

## Diagrams

| Feature  | Description      | Reference                                          |
| -------- | ---------------- | -------------------------------------------------- |
| Math     | KaTeX            | [diagram-latex](references/diagram-latex.md)       |
| Mermaid  | graphs           | [diagram-mermaid](references/diagram-mermaid.md)   |
| PlantUML | server-drawn UML | [diagram-plantuml](references/diagram-plantuml.md) |

## Presenter

| Feature        | Description                                    | Reference                                                  |
| -------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| Presenter view | presenter, notes page, sync, laser             | [presenter-view](references/presenter-view.md)             |
| Notes          | speaker notes                                  | [presenter-notes](references/presenter-notes.md)           |
| Timer          | `duration`, `timer`                            | [presenter-timer](references/presenter-timer.md)           |
| Remote         | `--remote=password`                            | [presenter-remote](references/presenter-remote.md)         |
| Recording      | camera, screen recording                       | [presenter-recording](references/presenter-recording.md)   |
| Dev extras     | side editor, write-back                        | [presenter-dev-editor](references/presenter-dev-editor.md) |
| Switches       | `presenter`, `editor`, `record`, `contextMenu` | [presenter-switches](references/presenter-switches.md)     |

## Build, Export, Offline

| Feature        | Description            | Reference                                                |
| -------------- | ---------------------- | -------------------------------------------------------- |
| Build and host | `--base`, 404, routing | [build-spa](references/build-spa.md)                     |
| Head and SEO   | title, Open Graph      | [build-seo-meta](references/build-seo-meta.md)           |
| Preview image  | `ogImage`              | [build-og-image](references/build-og-image.md)           |
| Remote assets  | `remoteAssets`         | [build-remote-assets](references/build-remote-assets.md) |
| PDF button     | `download`             | [build-pdf-download](references/build-pdf-download.md)   |
| Export         | PDF, PNG, PPTX, MD     | [export-formats](references/export-formats.md)           |
| Export options | flags and `export:`    | [export-options](references/export-options.md)           |
| Notes PDF      | `export-notes`         | [export-notes](references/export-notes.md)               |
| Print route    | `/print`               | [export-print-route](references/export-print-route.md)   |
| Offline folder | `build --offline`      | [offline-folder](references/offline-folder.md)           |
| PWA            | `pwa: true`            | [offline-pwa](references/offline-pwa.md)                 |
| Checklist      | day before a talk      | [offline-checklist](references/offline-checklist.md)     |

## Themes and Setup

| Feature         | Description                                 | Reference                                              |
| --------------- | ------------------------------------------- | ------------------------------------------------------ |
| Use a theme     | `theme`, `addons`                           | [theme-use](references/theme-use.md)                   |
| Official themes | seriph, shibainu, bricks, apple-basic, adev | [theme-official](references/theme-official.md)         |
| Write a theme   | folder, `theme.json`                        | [theme-write](references/theme-write.md)               |
| Roots           | what a root holds, who wins                 | [theme-structure](references/theme-structure.md)       |
| Eject           | `theme eject`                               | [theme-eject](references/theme-eject.md)               |
| Setup overview  | `setup/*.ts` hooks                          | [setup-overview](references/setup-overview.md)         |
| Shiki           | `setup/shiki.ts`                            | [setup-shiki](references/setup-shiki.md)               |
| KaTeX           | `setup/katex.ts`                            | [setup-katex](references/setup-katex.md)               |
| Transformers    | `setup/transformers.ts`                     | [setup-transformers](references/setup-transformers.md) |
| Preparser       | `setup/preparser.ts`                        | [setup-preparser](references/setup-preparser.md)       |
| Mermaid         | `setup/mermaid.ts`                          | [setup-mermaid](references/setup-mermaid.md)           |
| Monaco          | `setup/monaco.ts`                           | [setup-monaco](references/setup-monaco.md)             |
| Code runners    | `setup/code-runners.ts`                     | [setup-code-runners](references/setup-code-runners.md) |
| Shortcuts       | `setup/shortcuts.ts`                        | [setup-shortcuts](references/setup-shortcuts.md)       |
| Context menu    | `setup/context-menu.ts`                     | [setup-context-menu](references/setup-context-menu.md) |
| Main and root   | `setup/main.ts`, `setup/root.ts`            | [setup-main-root](references/setup-main-root.md)       |

## Tools

| Feature       | Description                                 | Reference                                    |
| ------------- | ------------------------------------------- | -------------------------------------------- |
| MCP server    | `slide-ng mcp`                              | [mcp-server](references/mcp-server.md)       |
| MCP tools     | the seven tools, two more on the dev server | [mcp-tools](references/mcp-tools.md)         |
| Not supported | what does not exist                         | [not-supported](references/not-supported.md) |

## Common Patterns

**Title, content, end**

<!-- verify -->

```md
---
title: Talk
---

# Title

---

# Point one

<slide-ng-clicks>

- a
- b

</slide-ng-clicks>

---
layout: end
---
```

**Code that builds up**: ranges per click on one block, ` ```ts {1|2-3|all} `, see `references/code-line-highlighting.md`.

**A counter component**: `components/counter.ts` (standalone, `input()` signals), `<my-counter #c />` and `{{ c.n() }}` in the slide, see `references/core-custom-components.md`.
