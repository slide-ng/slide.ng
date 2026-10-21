# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow [Semantic Versioning](https://semver.org/) once it is published.

## [Unreleased]

### Added

- The interface can be translated: `lang` (or `uiLang`) picks the language, and `locales/<lang>.json` in the deck, a theme or an addon translates it key by key (docs/UI-STRINGS.md). Turkish is built in (`lang: tr`).
- `lang` sets Angular's `LOCALE_ID`, so the `date`, `number` and `currency` pipes in slides format for the deck's language.
- `ar`, `he`, `fa` and `ur` set `dir="rtl"` (unless `htmlAttrs.dir` is given); the bar, menus and presenter mirror. The quick overview's arrow keys follow its mirrored grid; the other keys stay physical. An interface language written the other way than the page keeps the direction of its text, and the dev side editor takes each line's direction from its first letter.
- `--lang` for `dev`, `build` and `export`, and a recipe for one deck in several languages. `export --lang` is refused with `--dist` and `--url`, whose language is fixed when the deck is built.
- `<slide-ng-title-renderer />` draws a slide's title as HTML, with its inline markdown and `$math$` (Slidev's `<TitleRenderer>`); `no="N"` picks another slide. The table of contents shows the same HTML. Raw HTML in a title is shown as text.
- `notesAutoRuby: { word: reading }` in the headmatter shows a reading above each listed word in the speaker notes, with `<ruby>` (Slidev's `notesAutoRuby`). Code, tag attributes and existing `<ruby>` are left alone.
- Markdown links to slides move inside the deck, as in Slidev: `[x](5)`, `[x](./5)`, `[x](#/5)` and `[x](./alias)` become `<slide-ng-link>`, like `/5` and `/alias` before (#14).
- Markdown links to `http(s)` addresses open in a new tab (`target="_blank" rel="noopener"`), on slides and in speaker notes (#14).
- A link to a slide points at that slide's page on the print page and in an exported PDF, instead of at the address of the local server (#14).
- A link to a slide in the speaker notes, clicked in the presenter, moves the presenter to that slide instead of opening the audience page (#14).
- `themeConfig` in the headmatter (or a theme's `theme.json`) is applied as in Slidev: each text or number key becomes the CSS variable `--slidev-theme-<key>`, so `themeConfig: { primary: '#5d8392' }` recolours `text-primary`, the progress bar and the controls. Values that could break out of the CSS, and `url()` or `image-set()` values, are skipped with a warning. Numbers are written without a unit, as in Slidev (`radius: 6px` for a length). Themes and components read the whole map with the `THEME_CONFIG` token, slides as `themeConfig`. `examples/theme-minimal` takes its accent colour from `themeConfig.accent`.
- `routerMode: memory` keeps the address bar unchanged (Slidev's memory router), for kiosks and decks shown inside another page; the deck always opens at slide 1, and `/presenter` or `/notes` cannot be opened by address. The dev server keeps the slide when the page reloads after a save.
- `slide-ng build --router-mode history|hash|memory` replaces the headmatter's `routerMode` for one build; the build records it, so `export --dist` opens it with the right addresses. `--offline` keeps hash routing: `--router-mode memory` is refused, a headmatter `routerMode: memory` gives a warning.
- Pictures of the next slides are loaded before they are shown (Slidev's `preloadImages`: `true` by default, `{ ahead: n }` with `0` for none ahead, `false`), and a slide with `preload: false` is left out; at most two pictures load at a time, and the whole deck's (3 s after the page has loaded) is skipped when the browser saves data or the connection is 2g or 3g; `preloadProgress` and `preloadComplete` in `slide-ng/lib/preload-images` tell a component how far it is (a picture that fails counts as done; with `preloadImages: false` it is complete at once).
- Custom slide transitions by name, as in Slidev: a name that is not built in runs Vue's `<name>-enter-from`, `-enter-active`, `-enter-to` (and `leave`) classes, so the deck's CSS animates the slides. The object form (`name`, `enterFromClass` and the other class names, `duration`) is read too. Under `prefers-reduced-motion` a fixed `duration` ends at once.
- Click animation presets, as in Slidev: `clickAnimation` in the headmatter or a slide's frontmatter, modifiers on the attribute (`slide-ng-click.fade.right`, `slide-ng-after.up`, `slide-ng-click-hide.none`) and `<slide-ng-clicks animation="...">`. Presets `fade`, `fade-in`, `up`, `down`, `left`, `right`, `scale`, `none`; a deck's own is CSS on `.slidev-vclick-anim-<name>`. An element not revealed yet is inert (screen readers skip it, its links and buttons take no focus), also when `fade` shows it dimmed.
- Every Magic Move option of the headmatter's `shiki.magicMove` is read (`duration`, `stagger`, `delayMove`, `delayLeave`, `delayEnter`, `delayContainer`, `easing`, `animateContainer`, `containerStyle`, `splitTokens`, `enhanceMatching`), as in Slidev. The stagger is no longer fixed at 1 ms.
- Code block, code group and Magic Move titles draw an icon, as in Slidev: `~i-set:name~` in the title, or Slidev's built-in icons matched from the title (`npm`, `vue`, `package.json`, ...) when `@iconify-json/vscode-icons` is installed. A built-in name matches a whole word, a file extension or the start of a file name (`results.tsv` gets no TypeScript icon, unlike Slidev); every `~...~` is taken out of the shown title. A `<<<` snippet takes the title after the language (`<<< ./a.py python [a.py]`), with spaces and an icon.
- The headmatter `monaco` and `twoslash` take `true`, `false`, `dev` or `build`, as in Slidev: off for the current mode, `{monaco}` blocks are plain highlighted code and Twoslash does not run (a `{monaco-run}` with `showOutputAt` then has no click, so `monaco: build` counts one click less in `slide-ng dev`). `monacoRunUseStrict: false` runs `{monaco-run}` code without strict mode.
- `<slide-ng-switch>` takes `unmount` and `transition`, `<slide-ng-video>` takes `printPoster` and `printTimestamp` (`last` too), and `<slide-ng-render-when>` takes the `visible` context, as in Slidev.
- `progressBar` in the headmatter draws a progress bar on every slide (top or bottom, height, colours, clicks, and the minutes of the presenter timer; `progressBar: top` is short for the position, and a value that draws no bar is warned about); `<slide-ng-progress-bar />` places one in a slide or a layer.
- The `custom-nav-controls` layer (`layers/custom-nav-controls.ts` in a deck, theme or addon) adds buttons to the end of the navigation bar, on the deck and on the presenter page (Slidev's fifth global layer). The theme's, each addon's and the deck's are all drawn, in that order.
- A sync button in the bar opens Slidev's sync mode menu (Bidirectional Sync, Receive Only, Send Only, Disable) for the viewer or the presenter; a choice made in one window reaches the other windows of the browser. Opening the menu (with the mouse or the keyboard) focuses the ticked mode, the arrow keys move between the modes and Escape closes the menu and puts the focus back on the sync button.
- The presenter's notes pane can be resized by dragging its borders, with sizes kept per layout; in dev, **Edit Notes** edits the note in place (only the note is written to the markdown) and the side editor opens in the notes pane.

### Changed

- The date on the notes PDF is written in the deck's language instead of the browser's.
- `<html lang>` is written in the usual spelling: `lang: pt_br` gives `pt-BR`.
- An `<a href="/4">` written as HTML is left as written; only markdown links become slide links (#14).
- In a PDF made by `export` or `build --download`, other links to the deck's own site (`/file.pdf`, `<a href="/3">`) are text without a link, instead of links to the temporary server of the export.
- A `routeAlias` that is a number (`routeAlias: 2`) is refused: the address `/2` is slide 2, so the alias's slide could not be opened.
- A `routeAlias` that is empty, has `/`, `.`, `?`, `#` or `\`, or is on two slides (also through a `src:` import of several slides) stops the build, naming the slides.
- Markdown links to a unicode or emoji `routeAlias` (`[x](./café)`) become slide links too.
- The generator warns about a markdown link past the last slide (`[x](99)`), to a `./name` that is no `routeAlias`, or to the alias of a slide with `hide:`.
- `slide-ng-click.hide` and `slide-ng-after.hide` show the element first and hide it at its click, as `v-click.hide` does in Slidev (the `slide-ng-click-hide` flag); before, `.hide` was dropped without a word. `slide-ng-click-hide="3"` hides at click 3, as `v-click-hide="3"`; before, its value was ignored and it hid at the next click. `slide-ng-click="2" slide-ng-click-hide="3"` shows at click 2 and hides at click 3, as in Slidev; before, the hide value was ignored and it hid at click 2.
- A click range written as text, `slide-ng-click="[2, 4]"` or `slide-ng-click.up="[2, 4]"` (as `v-click.up="[2, 4]"`), is a range; before, it was ignored and the element was always visible. `[slide-ng-click.up]="[2, 4]"` builds too; before, it stopped the build with Angular's NG8002.
- `wakeLock` takes `true`, `false`, `dev` or `build` and is on by default, as in Slidev (it was off unless `wakeLock: true`); a choice already stored in the browser (`slidev-wake-lock`, also the `false` written by earlier versions on first use) is kept, so turn it on once in the settings menu. Off for the current mode, the settings menu has no wake lock entry.
- `{monaco-run}` code runs in strict mode (`"use strict"`), as in Slidev.

### Fixed

- `<slide-ng-youtube id="luoMHjh-XcQ?start=1234" />` starts at the given time, as in Slidev, instead of failing to find the video. YouTube's embed options in the id (`start`, `end`, `list`, `loop`, ...) are kept and others dropped; `start` and `list` can also be attributes. A start time (`start`, or `t` of a shared link) may be written YouTube's way (`1m30s`); one that is not a time is dropped with a warning.

## [1.0.0] - 2026-10-18

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
- `customElements` in the headmatter (`[model-viewer, sl-*]`) lets slides use web components; Angular's "is not a known element" error points to it.
- A `setup/monaco.ts` theme may be `{ light, dark }`; a single name is used in both modes and is no longer replaced when the mode changes.

### Changed

- Code sizes follow Slidev's (`--slidev-code-font-size` 12px, padding 8px, margin `4px 0`, inline code 0.9em in a light weight), and a raw `<pre>` is no longer styled.
- `download: true` in the headmatter makes the PDF when Chromium runs and only warns when it does not; `--download` still fails without it.
- A broken frontmatter stops the build with the file, line and slide; Angular's build errors name the `slides.md` line of the slide.
- With `dev --remote`, the presenter, notes and notes-print pages need the password (without it they go to the slides).
- A deck's `setup/shortcuts.ts` adds to a theme's shortcut provider instead of replacing it.
- The npm package no longer contains `src/slides/generated`.
- A shortcut added later wins over an earlier one with the same key (a later root's or the deck's replaces a built-in key), and a deck's `CODE_RUNNERS` provider wins over a theme's or addon's `setup/code-runners.ts`.
- A theme whose `theme.json` sets `colorSchema: light` or `dark` keeps that mode in every deck, as in Slidev.
- `--remote` logins are signed with the password, so they survive a restart of the dev server with the same password.
- `dev`, `build` and `export` each use their own working copy of the app (`.slide-ng/app`, `app-build`, `app-export`), so a build while `dev` runs no longer breaks it.
- The npm package no longer contains the maintenance scripts, `docs/screenshots` or `docs/contributing` (0.5 MB instead of 1.9 MB).

### Fixed

- Slidev showcase talks ported to test the port: `<slide-ng-clicks>` reveals each child (paragraphs, pictures, table rows), not only list items; `slide-ng-motion` follows the clicks in a `--with-clicks` PDF; classes in `[class.x]` bindings get their CSS; an `@` or `#` in an attribute value (`mailto:` links) no longer breaks the build; a deck's own `layouts/404.ts` is used; `<slide-ng-link title>` shows the title; a throwing `setup/monaco.ts` no longer blanks every editor; an iframe in the overview no longer takes the keys; indented and `~~~` fences load their language; a YAML comment in frontmatter no longer warns; pictures next to `slides.md` (`./images/x.png`) are copied into the build; old entities without `;` (`&ltA>`) read as browsers read them; footnotes use markdown-it-footnote's markup; a line of non-breaking spaces is blank.
- Link safety: a `javascript:` address with quotes of the other kind, character references or no quotes is replaced too, code samples that show one are left alone; a code option list left open (`{a: [1, 2}`) no longer hangs the generator.
- Warnings for `@apply`, `highlighter: prism` and an unloaded code language name the slide; an export whose page never goes idle says to use `--wait-until load`; Angular's "is not a known element" names the usual causes.
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
- Phones: swipes never moved the slides (the browser took the gesture), a sideways swipe went back in the history, a touch beside the slide moved at the start of a swipe, the bar was hidden in portrait so the first tap pressed a hidden button, and the next-slide preview of a presenter page on its side was 25 px tall.
- Sync: a viewer's move reached the presenter but not the other viewers; a device whose connection came back did not catch up; a second presenter showed a stopped timer; overtime past an hour read `1:-20:01`.
- Keyboard and screen readers: Tab left the overview and the info dialog, arrow keys moved the slides behind the info dialog and a modal `<dialog>`, the presenter timer had no buttons, the presenter page announced nothing, and the test readout and the closed goto box were read out.
- Side editor: editing a heading, a note or a click list reloaded the page and lost the caret, and a save after the slide had changed in the file could overwrite another slide (it is refused now). `{monaco-write}` lost the focus after the first save.
- Links: `[four](/4)` and `[x](/alias)` leave the deck no more (they move inside it, also with a base, hash routing or offline), `[x](#id)` scrolls on the same slide, links to `public/` files, `srcset`, `poster` and `<object data>` get the base, and `<slide-ng-link>` has a real address (Ctrl+click opens a new tab).
- Generator: a component used as an attribute after another one (`<button appRipple>`) was not imported; two addons with a `Badge` class lost one of them; the same selector in two roots stopped the build; a `<style>` inside `srcdoc` was taken as the slide's; spaces next to a Twoslash popup became boxes.
- Dev server: it did not start when slide.ng is installed in a folder with a space; a layout that stopped being used broke every later rebuild; a package updated in the deck was served from the old bundle; icon sets installed in the deck were not found.
- Export: slide PDFs lost their tags, and HTML in a heading (`<sub>`, `<ruby>`) showed in the outline, the tab title, the table of contents and goto. A range that picks no slide fails before the build.
- CLI: a value flag took the next flag as its value (`--out --base /x/`); theme.json values of the wrong type and an empty theme package are reported; the sandbox error no longer suggests installing a browser.
- App: radio buttons and checkboxes work with the keyboard again, keys that finish an input method's text no longer move the slides, table header alignment is kept, `bg-*` classes win over the reset on buttons, a custom code runner that throws no longer hangs, `theme-paper` headings use the deck's serif font, and a slow first visit says the slides are loading.

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

[Unreleased]: https://github.com/slide-ng/slide.ng/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/slide-ng/slide.ng/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/slide-ng/slide.ng/commits/main
