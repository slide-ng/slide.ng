# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/) once it is published.

## [Unreleased]

### Added

- Three example themes: `examples/theme-paper` (light, editorial), `examples/theme-moss` (dark, green and clay) and `examples/theme-blueprint` (navy drafting grid, with a light "whiteprint" palette), each with a cover and a section layout, a component and a README.
- `docs/CLI.md`, every command and flag; `slide-ng --version`; `slide-ng <command> --help` lists that command's flags.
- Angular's common pipes (`number`, `currency`, `date`, ...) and a deck's own pipes in `components/` work in slides; `@angular/forms` is included for slide components.
- Angular's common directives (`*ngTemplateOutlet`, `[ngClass]`, `*ngIf`, ...) and the forms directives (`[(ngModel)]`, `[formGroup]`, ...) work in slides, imported only where used.
- `## Title {#id .class}` on headings and `{width=120}` after a picture.
- `themeColor` in the headmatter (or a theme's `theme.json`) colours the installed app; a downloaded PDF is kept by the offline worker.
- `$math$` in a slide title is drawn in `<slide-ng-toc>`; `console.table` and `console.group` in `{monaco-run}`; a code runner may return its result directly.
- Warnings for `<script>` in a slide, an `@if`/`@for` in the middle of a line, `mdc: true` / `comark: true`, and a `javascript:` link (replaced by `#`).
- Slidev's UnoCSS shortcuts `abs-tl`, `abs-tr`, `abs-b`, `abs-bl`, `abs-br`, `bg-primary` and the z-index names `z-drawing`, `z-camera`, `z-dragging`, `z-label`, `z-focus-indicator`.
- `skills/slide-ng/references/port-a-slidev-deck.md`: a recipe for porting a Slidev deck, with a worked Vue to Angular example and a list of pitfalls.

### Changed

- Code sizes follow Slidev's (`--slidev-code-font-size` 12px, padding 8px, margin `4px 0`, inline code 0.9em in a light weight), and a raw `<pre>` is no longer styled.
- `download: true` in the headmatter makes the PDF when Chromium runs and only warns when it does not; `--download` still fails without it.
- A broken frontmatter stops the build with the file, line and slide; Angular's build errors name the `slides.md` line of the slide.
- With `dev --remote`, the presenter, notes and notes-print pages need the password (without it they go to the slides).
- A deck's `setup/shortcuts.ts` adds to a theme's shortcut provider instead of replacing it.
- The npm package no longer contains `src/slides/generated`.

### Fixed

- Big decks no longer fail on the bundle budget. `<slide-ng-drag-arrow pos>` is `x,y,width,height` as in Slidev; dragging on a slide with `zoom` follows the pointer; a drag position name missing from `dragPos` is reported.
- Clicks inside an `@defer` block are numbered in document order; `slide-ng-motion` range variants (`click-2-4`) are no longer applied in print and the overview; `<slide-ng-toc listStyle>` applies to every level.
- Generator: Mermaid fence options may be nested (`{sequence: {mirrorActors: false}}`); `Promise<void>` in prose is text; an escaped backtick stays a backtick; `<style>` in inline code is text; an icon with `class="inline"` stays visible; Vue's `<template #...>` slots, variant groups and `--uno:` are reported; all renamed Slidev names of a slide are listed at once.
- A code runner is picked by the code block's language (also one Monaco does not know), and an editor without a runner says so instead of running JavaScript; JSON, CSS and HTML editors no longer log worker errors.
- Errors in a deck's or theme's own files name that file, also in `dev`, and an import from a folder that is not copied says which folders are; in `dev` a slides.md the generator cannot read shows a banner in the page.
- The presenter timer survives a reload. Accessibility: slide changes are announced, unrevealed click items and the drawing layer are hidden from screen readers, `prefers-reduced-motion` stops transitions and animations, the colour buttons and settings fields have names, sliders show focus, and exported PDFs are tagged. Example themes: utility classes win over the slide background, the paper cover is readable on a photo, the blueprint section subtitle no longer overlaps, and link colours meet 4.5:1.
- Build: a `public/` file with `#` or a space in its name broke the offline worker's install; `remoteAssets` never downloaded pictures named in the frontmatter (`image:`, `background:`); a quoted `url('/a b.png')` did not get the base; a slide `<style>` with `url(/...)` in an offline folder now warns.
- Export: `export-notes --range` was ignored and the notes PDF had a dark frame; `--range 0` waited for 30 seconds; the PPTX subject and the PDF outline kept raw markdown (titles are plain text everywhere now).
- App: the iframe layouts' page was not white in a dark PDF and did not get the deck's base; `<slide-ng-video timestamp>` started at 0; after clicking a checkbox the arrow keys did nothing (Escape now also leaves a text field).
- Dev server: live reload stopped after an editor saved by renaming a new file over the old one, and edits of `<<<` snippet files were not seen.
- Themes: a `title:` on an importing slide lost to the imported slide's title; a `theme.json` layout entry without `props` dropped the built-in inputs, and unknown `theme.json` keys are reported; `theme eject` copied the `background` and `frame` helpers (`frame` became a layout) and ignored `SLIDE_NG_THEME`; frontmatter lists and objects reach layout inputs as values.
- A code fence inside a list item became stray backticks; a tag with bindings at the start of a line (`<span [title]>`) lost its paragraph and ran into the next one; `{{` inside `$inline math$` showed a placeholder.
- `---` straight followed by a heading and text is read as frontmatter (as in Slidev): a warning now says the text is lost; a last slide written that way no longer shows a stray rule, and `slide-ng format` no longer turns it into an empty slide (it refuses to write when the slide count would change). `defaults: { level }` reaches the table of contents, and errors on slide 1 name line 1 instead of 0.
- A tag with bindings or a `#ref` written over several lines, or a multi-line `@let`, was shown as text; a wrapper tag with bindings turned the lines inside it into paragraphs (so `ng-content select` missed them, and some decks failed with NG5002).
- A directive in `components/` with a selector like `button[appRipple]`, a list (`[a], [b]`) or used as `*structural` was never imported; a pipe inside a `<code>` written in HTML was not imported; `{#id}` on a heading could land on an earlier heading; `\|` in code in a table cell kept its backslash.
- PDF export: diagrams taller than the slide were lost, persisted drawings were missing, global layers showed slide 1 on every page, a Mermaid syntax error added a page, `\begin{align}` numbers stayed at (1), and the subject held raw markdown.
- Generator: `$first`/`$last` in bindings became math, `@keyframes` in a slide `<style>` did nothing, the space between two inline elements was dropped, `\|` in `{{ }}` in a table broke the build, a deck's own `theme.json` was ignored, and Twoslash `^?` popups covered the code.
- App: clicks inside a component were numbered after the slide's later clicks, view transitions with a shared `view-transition-name` were skipped, Monaco ignored the dark mode, `slide-ng-mark` was drawn too low when a web font arrived late, a `maxHeight` code block scrolled the page and the overview, auto-fit text overlapped, a scaled Mermaid diagram ran off the slide, code and math were mirrored in right-to-left decks, an `iframe` page was dark in a dark deck's PDF, `{monaco-diff}` logged an error when left, and the table of contents marked the wrong slide in print.
- CLI and dev server: `theme eject` refused theme folders outside the deck, an ejected theme warned about `background.ts`, a missing `slides.md` gave a raw error, `dev --remote --bind` listed addresses it did not answer on, Monaco's icon font was refused for a deck outside the package, and a failed setup hook printed a stack trace.
- MCP: `remove_slide` named the wrong slide, `update_slide` could not add or remove frontmatter, and edits dropped the blank line before `---`.
- Themes: cover pictures, layout inputs (`issue`, `date`, `no`, `sheet`), end slides, subtitle contrast, task lists and Arabic headings in the example themes.
- A code block is a block box, so the margin and border of `.slidev-code-wrapper` apply (the wrapper was an inline element).

## [0.1.0] - 2026-10-16

The first version, built in phases.

### Added

- Phase 0, the core: one `slides.md` is split with Slidev's parser, and each slide becomes a standalone Angular component compiled ahead of time. Routing, keyboard navigation, scaling on a 16:9 canvas, UnoCSS styling and unit tests.
- Phase 1, Slidev's slide features: all layouts with the same names and props, slots, clicks (`v-click`, `v-after`, `v-clicks`, `v-switch`), transitions, the navigation bar, overview, table of contents, `src:` imports, headmatter defaults and speaker notes.
- Phase 2, content: Shiki code with line highlights stepped by clicks, snippets, code groups, Magic Move, Twoslash, KaTeX, Mermaid, PlantUML, Monaco editors, built-in components, `v-mark`, icons as tags, alerts and footnotes.
- Phase 3, presenting: presenter view, notes, timer, laser pointer, synced windows, drawing, camera and screen recording, `v-drag` written back into the markdown, layers, and the dev companion server with its security rules.
- Phase 4, tooling: export to PDF, PNG, PPTX and Markdown, static, base-path and offline builds, an install-and-go PWA mode, themes and addons, setup files, the `slide-ng` command with `create`, `format` and `theme eject`, and an MCP server.
- Repository files for open source hosting: contribution guides, issue and pull request templates, CI workflows, linting, formatting, git hooks and commit message checks.
- An agent skill for coding agents (`skills/slide-ng`): `SKILL.md` and one short reference per feature, with a list of what is not supported. `slide-ng skills install [--dir <folder>] [--force]` copies it into a project (`.agents/skills/slide-ng` by default).
- `npm run test:skills` builds every code sample of the skill; `npm run check:skills` fails when a document that the skill was written from changed after the hash recorded in `skills/GENERATION.md` (`npm run update:skills-hash` records new hashes). Both run in CI.
- `docs/AGENT-SKILL.md`.

- `docs/SECURITY-MODEL.md`, and a non-blocking `npm audit` job in CI.
- **Built-in names have the library prefix `slide-ng-`.** The Vue-style `v-*` names and the short element names are gone, with no aliases. The generator stops with `renamed to slide-ng-...` when a slide still uses an old one. The rule and the full table are in `docs/RENAMES.md`.

  | old                                                                                                                           | new                                                                                                                                                                                    |
  | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `v-click`, `v-after`, `v-click-hide`                                                                                          | `slide-ng-click`, `slide-ng-after`, `slide-ng-click-hide`                                                                                                                              |
  | `v-mark`, `v-motion`, `v-drag`                                                                                                | `slide-ng-mark`, `slide-ng-motion`, `slide-ng-drag`                                                                                                                                    |
  | `<v-clicks>`, `<v-click-gap>`, `<v-switch>`                                                                                   | `<slide-ng-clicks>`, `<slide-ng-click-gap>`, `<slide-ng-switch>`                                                                                                                       |
  | `<v-drag>`, `<v-drag-arrow>`                                                                                                  | `<slide-ng-drag>`, `<slide-ng-drag-arrow>`                                                                                                                                             |
  | `<slide-toc>`, `<slide-current-no>`, `<slides-total>`, `<slide-link>`, `<slide-video>`                                        | `<slide-ng-toc>`, `<slide-ng-current-no>`, `<slide-ng-total>`, `<slide-ng-link>`, `<slide-ng-video>`                                                                                   |
  | `<light-or-dark>`, `<render-when>`, `<arrow>`, `<transform>`, `<auto-fit-text>`                                               | `<slide-ng-light-or-dark>`, `<slide-ng-render-when>`, `<slide-ng-arrow>`, `<slide-ng-transform>`, `<slide-ng-auto-fit-text>`                                                           |
  | `<youtube>`, `<tweet>`, `<blue-sky>`                                                                                          | `<slide-ng-youtube>`, `<slide-ng-tweet>`, `<slide-ng-blue-sky>`                                                                                                                        |
  | `<mermaid>`, `<plant-uml>`, `<monaco>`, `<code-group>`, `<code-block-wrapper>`, `<shiki-magic-move>`, `<katex-block-wrapper>` | `<slide-ng-mermaid>`, `<slide-ng-plant-uml>`, `<slide-ng-monaco>`, `<slide-ng-code-group>`, `<slide-ng-code-block-wrapper>`, `<slide-ng-magic-move>`, `<slide-ng-katex-block-wrapper>` |

  Layout names, frontmatter keys, CSS classes, `$clicks`-style variables and the `::code-group` block are unchanged. The runtime classes and files follow (`VClick` is `SlideNgClick`).

### Changed

- `--remote` always has a password: when none is given (`--remote=secret`, `SLIDE_NG_PASSWORD`, or a prompt on a terminal), a random one is made and printed with the presenter address. There is no passwordless remote mode any more (this differs from Slidev). The start-up text says what the password allows. Wrong passwords are limited per client address and a login lasts 8 hours.
- `{monaco-write}` saves only into text-like files inside the deck's folder; `setup/`, `layouts/`, `components/`, `.git/`, `node_modules/`, package, lock, config and hidden files are refused.
- Snippets (`<<<`) and `src:` imports must be inside the deck's folder or a theme or addon folder, otherwise the build stops. `allowOutsideRoot: true` in the headmatter lifts that.
- Build-time downloads (`remoteAssets`, `fonts.selfHost`) refuse non-public addresses, follow at most 3 redirects, cap the size, check the file's first bytes and no longer download SVG. `fonts.provider` must be `google`, `coollabs` or `none` unless `fonts.allowCustomProvider: true`.
- `export` keeps Chromium's sandbox; as root or in a container pass `--no-sandbox` (or set `SLIDE_NG_NO_SANDBOX=1`). The exported page cannot reach private addresses unless `--allow-local`.

### Fixed

- Symbolic links: `confine` checks the file itself, writes refuse links, and a symlinked `.slide-ng` is refused. The drawing filter on the server is a parser with an allowlist. The offline cache name changes when a file changes without changing its length.
- `docs/SYNTAX.md` explained custom components, layers and shortcuts as changes inside `src/app`; a deck uses `components/`, `layers/` and `setup/shortcuts.ts`. `docs/PARITY.md` said 22 layouts; there are 21.

### Known gaps

See `docs/STATUS.md` for what is missing or not verified.

[Unreleased]: https://github.com/slide-ng/slide.ng/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/slide-ng/slide.ng/commits/main
