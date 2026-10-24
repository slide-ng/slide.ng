# Architecture

slide.ng has two halves: a **generator** (plain Node scripts, runs before Angular) and a
small **Angular app** (shows the generated slides).

```
slides.md  (+ files it imports with `src:`)
   |  scripts/generate.mjs
   v
src/slides/generated/        <- not committed
   slide-001.ts ... slide-NNN.ts   one standalone Angular component per slide
   index.ts                        list of slides + metadata, headmatter, info html
   index.html                      the page (title, SEO tags, favicon, manifest link) made from src/index.html
   uno.css, features.css, theme.css  styles (class names in use, feature stylesheets, theme styles)
   layers.ts, setup.ts             layer components and setup providers found in the roots
   roots/<id>/...  public/         copies of the theme, addon and deck folders, and their merged public files
   remote-assets/                  pictures downloaded for `remoteAssets` (production builds only)
   languages.ts, ui-text.ts        the deck's languages (none without `languages`), the interface text and locale
   deck.<lang>.ts                  with `languages`: each language's slide list (its slides are slide-NNN.<lang>.ts)
   |
   v  ng build / ng serve  (normal Angular CLI, AOT)
dist/slide-ng/browser
```

## The generator (`scripts/`)

| file                                                                                   | job                                                                                                                                     |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `generate.mjs`                                                                         | entry point: read the deck, write the generated files, optional `--watch`. `SLIDES_FILE=path` builds another deck (tests do)            |
| `dev.mjs`                                                                              | `npm start`: the same as `slide-ng dev` (`cli/dev.mjs`)                                                                                 |
| `lib/parse-deck.mjs`                                                                   | read the deck with `@slidev/parser` (`load`: follows `src:` imports), merge headmatter `defaults`                                       |
| `lib/deck-config.mjs`                                                                  | read the deck's `slide-ng.config.yaml` (`.yml`, `.json`) next to the entry file: its headmatter keys and their lines                    |
| `lib/layouts.mjs`                                                                      | table of the 21 layouts (component, props, slots) and `layoutName` (fallback with a warning)                                            |
| `lib/slots.mjs`                                                                        | `::name::` slot sugar: cut a slide's markdown into slots                                                                                |
| `lib/scoped-style.mjs`                                                                 | pull `<style>` blocks out of a slide and scope them to the slide                                                                        |
| `lib/to-template.mjs`                                                                  | one piece of markdown -> Angular template string                                                                                        |
| `lib/emit.mjs`                                                                         | TypeScript source of one slide component                                                                                                |
| `lib/index-source.mjs`                                                                 | TypeScript source of `index.ts`                                                                                                         |
| `lib/registry.mjs`                                                                     | table of components that slides can use (and re-export of the layouts)                                                                  |
| `lib/renamed.mjs`                                                                      | old names of the built-ins (`v-click`, `<slide-toc>`, ...); a slide that uses one fails with `renamed to slide-ng-...` (see RENAMES.md) |
| `lib/make-css.mjs`                                                                     | build UnoCSS output for the class names found (deck, generated slides and `src/app`)                                                    |
| `lib/fences.mjs`                                                                       | line scanner that finds code fences, `<<<` snippet lines and `::code-group`, and leaves a placeholder for each                          |
| `lib/code/meta.mjs`                                                                    | reads a fence's info string: language, `[title]`, `{ranges}`, `{options}`                                                               |
| `lib/code/highlighter.mjs`, `render-code.mjs`                                          | Shiki (both themes as CSS variables) and the HTML of one highlighted block (with Twoslash)                                              |
| `lib/code/render-fence.mjs`                                                            | decides what a fence becomes: code, group, magic move, mermaid, plantuml or Monaco                                                      |
| `lib/code/snippet.mjs`, `magic-move.mjs`, `diagrams.mjs`, `plantuml.mjs`, `monaco.mjs` | one job each; see the file headers                                                                                                      |
| `lib/math.mjs`                                                                         | cuts `$...$` and `$$...$$` out of the markdown and renders them with KaTeX                                                              |
| `lib/features.mjs`                                                                     | scans the deck for what it uses (languages, math, Monaco, Magic Move, Twoslash)                                                         |
| `lib/directives.mjs`, `icons.mjs`, `alerts.mjs`, `footnotes.mjs`                       | `slide-ng-mark` / `slide-ng-motion` modifiers and props, icon tags, GitHub alerts and footnotes                                         |
| `lib/pack.mjs`                                                                         | JSON -> deflate -> base64, so text with `{{ }}` can travel in an attribute (the browser has `code/unpack.ts`)                           |
| `lib/protect.mjs`                                                                      | the entity escaping for `{ } @` and the `attr()` helpers                                                                                |
| `lib/roots.mjs`                                                                        | the roots of a deck (theme, addons, deck folder): find them, read `theme.json`, merge default headmatter                                |
| `lib/scan-roots.mjs`, `sync-roots.mjs`, `theme-files.mjs`                              | find layouts and components in the roots, copy the roots into `generated/roots`, write `layers.ts`, `setup.ts`, `theme.css`             |
| `lib/theme-config.mjs`                                                                 | the `themeConfig` headmatter as `--slidev-theme-<key>` variables for `theme.css`, with the checks of the values                         |
| `lib/head.mjs`                                                                         | tags for `<head>` from the headmatter (title, description, Open Graph, favicon, `htmlAttrs`), escaped                                   |
| `lib/ui-text.mjs`, `lang.mjs`                                                          | the interface language: `locales/<lang>.json` of the roots merged and checked against `en.ts`, the Angular locale, writes `ui-text.ts`  |
| `lib/languages.mjs`                                                                    | `languages`: reads the other languages' files, pairs their slides by number, writes `languages.ts` and the `index.ts` that picks one    |
| `lib/remote-assets.mjs`, `build-options.mjs`                                           | download remote pictures for a build; read the `SLIDE_NG_*` variables that `slide-ng build` sets                                        |
| `lib/frontmatter-edit.mjs`                                                             | set one key in a deck's headmatter and keep the rest of the file (`theme eject` uses it)                                                |

### Why placeholders in `to-template.mjs`

Markdown converters would damage Angular syntax (`@if (x) {` is a paragraph to them, `[a]="b"`
may be changed). So the generator replaces each piece of Angular syntax by a harmless word,
runs the converter, and puts the original text back. Code fences and inline code are set aside
the same way and written out escaped, with `ngNonBindable`, so `{{ x }}` inside code stays text.
Remaining `{`, `}` and `@` in normal text become HTML entities.

### Code, math and other fences

Fences are cut out first (`fences.mjs`) and written back last (`code/render-fence.mjs`). Syntax is coloured by Shiki while generating,
so the browser gets finished HTML inside `<slide-ng-code-block-wrapper>`. That component only adds behaviour: line numbers, the copy button, and the
highlight ranges, which are an attribute (`ranges="2-3|5"`) turned into classes by the current click. `RangedBlock` is the base class that code and
math blocks share. Anything with text that Angular would read as a binding (Magic Move steps, Mermaid, Monaco) is passed `pack()`ed.

`features.mjs` scans the deck before generating, and `generate.mjs` writes `src/slides/generated/features.css` with only the stylesheets that deck needs
(KaTeX, Magic Move, Twoslash, Monaco). Heavy code (Monaco, Mermaid, Magic Move, rough-notation) is reached only through `import()`, so it is a lazy chunk;
`tsconfig.app.json` lists only `src/main.ts` so that unused features (and Monaco's workers) are not compiled into decks that do not use them.
The starter test checks that the output of a deck without them contains none of their code.

### Rewrites before markdown

Before the markdown converter runs, `to-template.mjs` rewrites the Vue-like forms into plain Angular: `slide-ng-mark.red="1"` becomes
`mark-mods="red" slide-ng-mark="1"`, the `:initial` / `:click-N` attributes of `slide-ng-motion` become one `[slide-ng-motion]="{ ... }"` binding (Angular has no
dynamic input names), and `<carbon-apps />` becomes `<span class="i-carbon:apps"></span>`. After it: alerts are found in the HTML, and footnotes are listed at the end.

### Layout wrapping and slots

Slidev wraps every slide in its layout with a Vite plugin. We do it in the generator: the slide's
template is `<sn-two-cols ...props>...content...</sn-two-cols>` and the slide component imports the layout.
Frontmatter keys that the layout lists in `layouts.mjs` (`image`, `url`, ...) become attributes, which are the
layout's inputs. A layout's host element is its `.slidev-layout` root, like in Slidev, so `class:` lands on it.

`::name::` lines cut the slide into slots (`slots.mjs`). Each named slot becomes
`<ng-container ngProjectAs="[name]">...</ng-container>`, and the layout has `<ng-content select="[name]" />`.

### Per-slide style

The `<style>` text goes into the slide component's `styles`, wrapped in `slide-003 { ... }` with
`ViewEncapsulation.None`. The slide's own tag name is the scope and CSS nesting does the rest.

## The app (`src/app/`)

| file                                                                                         | job                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `deck.ts`                                                                                    | the route `/:no`: stage and canvas, keys, mouse, `?clicks=` in the URL; hosts the controls                                                                                                                                           |
| `lib/nav.ts`                                                                                 | `Nav`: current slide, next/prev/go, table of contents, address -> slide (number or `routeAlias`)                                                                                                                                     |
| `lib/stage.ts`                                                                               | puts slides on the canvas and plays transitions (two slides in the page while it runs)                                                                                                                                               |
| `lib/transitions.ts`                                                                         | which transition applies, and the animation of each (Web Animations)                                                                                                                                                                 |
| `lib/shortcuts.ts`                                                                           | list of `{ name, key, run, when }`, the default keys, `SHORTCUTS_SETUP` to change them                                                                                                                                               |
| `lib/actions.ts`                                                                             | connects shortcut names to what they do                                                                                                                                                                                              |
| `lib/ui-state.ts`                                                                            | `Ui`: which dialog or menu is open, slide scale, overview highlight                                                                                                                                                                  |
| `lib/dark.ts`, `lib/fullscreen.ts`, `lib/idle-cursor.ts`                                     | dark mode, fullscreen, hide idle cursor                                                                                                                                                                                              |
| `lib/mount-slide.ts`, `lib/slide-context.ts`                                                 | create a slide component and tell it its number and where it is drawn                                                                                                                                                                |
| `lib/slide-hooks.ts`                                                                         | `onSlideEnter`, `onSlideLeave` and `isSlideActive()` for components in a slide                                                                                                                                                       |
| `lib/toc-tree.ts`                                                                            | pure functions: table of contents tree and its filters                                                                                                                                                                               |
| `lib/canvas.ts`                                                                              | canvas size (980x552, or headmatter `canvasWidth` / `aspectRatio`), `zoom`, the scale formula `min(w/width, h/height)`                                                                                                               |
| `lib/clicks.ts`                                                                              | `ClicksContext`: per-slide click state (current, total, relative/absolute/range maths)                                                                                                                                               |
| `lib/slide-ng-click.ts`, `slide-ng-clicks.ts`, `slide-ng-click-gap.ts`, `slide-ng-switch.ts` | click directives and components                                                                                                                                                                                                      |
| `lib/slide-base.ts`, `slide-meta.ts`                                                         | base class of generated slides (with the global context `$clicks`, `$page`, `$nav`, ...); type of an index entry                                                                                                                     |
| `lib/theme-config.ts`                                                                        | the `THEME_CONFIG` token: the merged `themeConfig` map for themes, components and slides                                                                                                                                             |
| `code/*.ts`                                                                                  | `slide-ng-code-block-wrapper`, `slide-ng-code-group`, `magic-move`, `katex-block`, `mermaid`, `slide-ng-plant-uml`, `monaco-editor` (+ `code-runner`); `monaco/` holds the lazy Monaco setup, its two workers and the sandbox runner |
| `lib/slide-ng-mark.ts`, `mark-options.ts`                                                    | `slide-ng-mark` directive (rough-notation, lazy) and the pure option reader                                                                                                                                                          |
| `lib/slide-ng-motion.ts`, `motion-style.ts`                                                  | `slide-ng-motion` directive and the pure variant maths                                                                                                                                                                               |
| `builtin/*.ts` (phase 2)                                                                     | `arrow`, `transform`, `slide-ng-auto-fit-text`, `youtube`, `slide-ng-video`, `tweet`, `slide-ng-blue-sky`                                                                                                                            |
| `layouts/*.ts`                                                                               | one small component per layout (`background.ts` and `frame.ts` are helpers)                                                                                                                                                          |
| `builtin/*.ts`                                                                               | `slide-ng-toc`, `slide-ng-link`, `slide-ng-current-no`, `slide-ng-total`, `slide-ng-light-or-dark`, `slide-ng-render-when`                                                                                                           |
| `i18n/*.ts`                                                                                  | the interface text: `en.ts` (every key), the `UI_TEXT` token, the `t` pipe; `locales/` holds the built-in translations (docs/UI-STRINGS.md)                                                                                          |
| `ui/*.ts`                                                                                    | nav bar, context menu, overview and thumbnail, goto box, info dialog, settings menu, icon button                                                                                                                                     |

### Clicks

Every slide component lists `ClicksContext` in its `providers`, so each slide has its own state.
Every element with `slide-ng-click` registers itself when it is created. Angular creates directives in template
order, and that order is what makes `+1` (relative) work: each element asks "what is the sum of the
steps before me?". When the slide has rendered, the context knows the largest click number: the
slide's `total` (or the `clicks:` frontmatter value). `current` is a signal clamped between `clicksStart` and `total`,
and each element turns the signal into CSS classes (`slidev-vclick-hidden` hides it).

### Navigation and state

`Deck` provides `Nav` and `Ui` for itself, so everything inside it (controls, and the slides, which are created
inside it) can inject them. The URL is the state: `/7?clicks=2`. When the route changes the deck asks `Stage`
to show the slide: the old slide is removed (or animated away), a new component is created with a fresh `ClicksContext`.
`?clicks=N` is read when the slide is created and written back with `history.replaceState` as clicks change (left out at click 0, as in Slidev).
Slides get their number and render context (`slide`, `overview`) from two injection tokens, which is how
`<slide-ng-current-no>` and `<slide-ng-render-when>` know where they are.

### Overview

`ui/overview.ts` draws one `ui/thumbnail.ts` per slide inside `@defer (on viewport)`, so slides far down the page are
only created when scrolled to. A thumbnail is the real slide component, set to its last click (or the `clicks` it is given) and scaled with CSS.
The `/overview` page (`presenter/overview-page.ts`) uses the same thumbnails in a list, with a clicks slider and the notes beside each.

### Transitions

`Stage.show()` creates the new slide before removing the old one. For `slide-*` and `fade*` both elements get a
Web Animation (`translate` / `opacity`, from Slidev's `transitions.css`) and the old one is destroyed when both are done.
`view-transition` calls `document.startViewTransition` around the swap. A new navigation during an animation finishes
the running one at once.

## Presenter, sync and interaction (phase 3)

| folder         | job                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync/`        | `SyncState` (signals `shared` and `drawings`), the `SyncTransport` interface, `BroadcastTransport`, `nav-sync.ts` (presenter drives, viewers follow), `shared-state.ts` (cleaning of everything received) |
| `presenter/`   | `/presenter/:no`, `/notes`, `/overview`, `/notes-edit` and `/entry` pages, timer, notes with click markers, next-step preview, clicks slider, presenter cursor and laser, `PresenterPrefs`                |
| `drawing/`     | drauu wrapper `Drawings`, toolbar, layer, sanitiser, persistence (localStorage, dev files)                                                                                                                |
| `record/`      | `Devices`, `Recorder` (MediaRecorder), camera bubble, recording buttons, screen mirror                                                                                                                    |
| `drag/`        | `slide-ng-drag` directive, `<slide-ng-drag>`, `<slide-ng-drag-arrow>`, the handles (`drag-controls.ts`), pure math (`drag-math.ts`)                                                                       |
| `dev/`         | only active in a dev build: `DevApi`, WebSocket transport, side editor, drawing upload                                                                                                                    |
| `scripts/dev/` | the companion server (below)                                                                                                                                                                              |

### Sync

`SyncState` owns two signals and sends changes through every provided `SYNC_TRANSPORTS` entry; it never knows how messages travel.
Three channels exist: `shared` (page, clicks, timer, cursor), `drawings` and `hello`. Everything received passes `cleanShared` / `cleanDrawings` first.
`startNavSync(nav)` runs on the deck and presenter pages: the presenter's page and clicks are sent, a viewer applies what arrives (an effect keyed on page, clicks and a `lastUpdate` stamp, so an echo is ignored).
`Nav.ready` and `setContext(no, clicks)` make sure the click count sent belongs to the slide that is really on screen. Adding a transport means one more provider; the dev build adds the WebSocket one.

### Dev companion server and its security

`npm start` runs three processes: the generator in watch mode, `scripts/dev/server.mjs` and `ng serve`. The companion binds to 127.0.0.1 and `ng serve` proxies `/__slide-ng/*` to it (`proxy.conf.mjs`, WebSockets too).
`npm start -- --remote[=password]` makes only `ng serve` listen on 0.0.0.0 (`--bind` changes the address, in remote mode only) and prints the LAN and presenter addresses (`cli/remote-info.mjs`). There is always a password (`--remote=secret`, `SLIDE_NG_PASSWORD`, a prompt on a terminal, or a random one that is printed), and the Host, Origin, token and path checks below still apply. The companion server refuses to start in remote mode without one.

```
browser --/__slide-ng/*--> ng serve (0.0.0.0 with --remote) --proxy--> companion (127.0.0.1)
                                                                        check: Host, Origin, cookie, token
```

| file                                     | job                                                                                                                                       |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.mjs`                               | `check` (Host, Origin, password cookie, token), `confine` (path inside the deck folder), `readBody` (size limit), constant-time compare   |
| `routes.mjs`                             | the HTTP routes: `/session`, `/login`, `/slides/:n/drag`, `/slides/:n/source`, `/slides/:n/note`, `/notes`, `/drawings/:n`, `/monaco/:id` |
| `slide-source.mjs`                       | pure text edits of one slide inside its file (drag positions, frontmatter `dragPos`, whole-slide replace)                                 |
| `slides-write.mjs`                       | finds the slide and its file with the parser, then writes                                                                                 |
| `drawings-store.mjs`, `monaco-write.mjs` | drawing files (`<integer>.svg`), listed `{monaco-write}` files                                                                            |
| `ws-hub.mjs`                             | passes `{channel, data}` between connected pages                                                                                          |

Rules, each covered by tests (`server.spec.ts`, `auth.spec.ts`, `tests/e2e/dev-server.mjs`):
the server listens on loopback only; `Host` and `Origin` are checked for every request and every WebSocket upgrade; writes need the random session token and a JSON content type;
with a password the cookie is needed too; a request never names a file (slide number through the parser, `<integer>.svg`, a generator-written id list) and every path is confined to the deck folder
(`..`, absolute paths and symlinks out are refused); bodies and WebSocket messages have size limits; drawing markup is checked against a shape whitelist.
Writes run one after another so two quick edits cannot overwrite each other. The generator watches the markdown, so a written change comes back as a rebuild.

### slide-ng-drag, layers and canvas

The generator numbers every `slide-ng-drag` (`drag-sites.mjs`) and adds `drag-site="N"`. In the browser the directive reads the place (inline text, or a name looked up in the slide's frontmatter `dragPos`),
puts the element at it and, on a move, tells `DragState`, which keeps the place for this visit and hands it to the dev server's saver. `generated/layers.ts` imports the layer files that exist;
`app-slide-layer` shows one. `zoom` is a CSS variable on the slide element and one rule in `styles.css`.

## Export, build, themes, CLI and MCP (phase 4)

```
bin/slide-ng.mjs  ->  scripts/cli/<command>.mjs   dev, build, export, export-notes, format, theme, create;  scripts/mcp for mcp
```

**CLI.** `bin/slide-ng.mjs` only picks a command (`cli/pick-command.mjs`) and loads it. `cli/flags.mjs` is the one flag reader (unknown flags fail).
`cli/runtime.mjs` runs the generator and `ng build` for one deck; `cli/app-root.mjs` decides where: a deck inside this repository (tests, `npm start`) is built in place,
any other deck gets a working copy of the app in `<deck>/.slide-ng/` (a fresh copy of `src/`, the Angular and TypeScript settings and `public/`, with `node_modules` linked), so an
installed package is never written to. `dev`, `build` and `export` each have their own copy (`app`, `app-build`, `app-export`), so a build while the dev server runs leaves it alone. The package is one package with a `bin` entry and a `template/` folder for `create` (not a monorepo; see DECISIONS.md).

**Print route.** `/print` (and `/presenter/print` for notes) draws every slide as `.print-slide-container` with the id `<slideNo>-<clickN>`; `?print=clicks` makes one page per click
step. It sets `data-slide-ng-print="ready"` when done. Components that load late (Mermaid, PlantUML, Monaco, Magic Move, `slide-ng-mark`, code runners) put `data-slide-ng-waitfor` on
themselves until they are drawn, and the exporter waits for none to be left.

**Export** (`scripts/export/`). `cli/export.mjs` builds the deck (or uses `--dist` or `--url`), serves it with `static-server.mjs` (base path, SPA fallback, path confinement) and
`index.mjs` drives Chromium through `playwright-core`: `page.mjs` opens the print route and waits, `pdf.mjs` makes one PDF page per slide or click step and merges them with `pdf-lib`
(title, outline from `outline.mjs`), `images.mjs` takes PNGs, `markdown.mjs` writes the Markdown file and its pictures, `pptx.mjs` makes a PPTX of pictures with `pptxgenjs`.
File names pass `filename.mjs` (`exportFilename` becomes a plain name); `--output` can only name files in the current folder or a folder the exporter creates.

**Build** (`cli/build.mjs`). `ng build --output-path .slide-ng/build --base-href <base>`, then `build/og-image.mjs`, the optional PDF, `404.html`, `_redirects` and
`build/pwa-icons.mjs` (install icons, drawn with Chromium) and `build/pwa.mjs` (`manifest.webmanifest`, `sw.js` with a cache name from a hash of the file list). The result is copied into `--out` by `cli/safe-dir.mjs`, which only replaces a
folder that carries the marker file `.slide-ng-build`, and removes the work folder it made itself. `app/lib/offline-worker.ts` registers the worker in production builds and `app/ui/offline-badge.ts` shows its state.

**Roots** (themes and addons; reference in THEMES.md). `generate.mjs` calls `parseDeck` with the roots (theme, addons, deck folder), `theme-files.mjs` copies them into
`generated/roots/<id>/`, and the app picks up what they bring through generated files: `layers.ts`, `setup.ts` (providers added in `app.config.ts`), `theme.css` (last style in
`angular.json`) and `generated/public` (a second asset folder). `tsconfig.json` maps `slide-ng/*` to `src/app/*` so copied theme code can import the app. In dev the generator watches the root folders.

**MCP** (`scripts/mcp/`). `index.mjs` is a stdio server (`@modelcontextprotocol/sdk`), `tools.mjs` has the seven tools, `deck-edit.mjs` the text edits (remove, insert, move; pure functions
tested with the real parser). The dev companion serves the same tools over streamable HTTP at `/__mcp` (`dev/mcp-http.mjs`, proxied like `/__slide-ng`),
with two more from `dev-tools.mjs`: `get_info` and `goto_slide`, which sends a move through the sync hub. Every change is parsed again before it is written, and only the deck's own markdown files are touched (`dev/auth.mjs` `confine`, the same check the dev server uses).

## Styling

UnoCSS, with `@unocss/core`, the `wind3` preset (dark variant by class) and `preset-icons` with the Carbon set
(`i-carbon:maximize` and friends, like Slidev), called from `generate.mjs`. It reads the deck and `src/app/**/*.ts` and
writes `src/slides/generated/uno.css`, which is a global style in `angular.json`. `src/styles.css` imports the UnoCSS
reset and `src/styles/` (variables, the layouts' typography ported from Slidev's theme, buttons) and holds the page frame and click classes.

## Tests

- `scripts/lib/*.spec.ts` and `src/app/**/*.spec.ts`: unit tests run by `ng test` (Vitest).
- `tests/e2e/run.mjs`: builds the starter deck `slides.md`, serves `dist/`, drives Chromium (`playwright-core`): navigation and clicks.
- `tests/e2e/showcase.mjs` + `showcase/`: builds `tests/e2e/showcase/slides.md` (every layout, TOC, built-ins, transitions, `src:` import)
  into `dist/showcase` and checks layouts, controls, shortcuts, transitions and built-ins.
- `tests/e2e/phase2.mjs` + `phase2/`: builds `tests/e2e/phase2/slides.md` (every code and content feature) into `dist/phase2` and runs one file per topic
  (`code`, `magic`, `math`, `diagrams`, `monaco`, `twoslash`, `components`, `mark`, `markdown`). `node tests/e2e/phase2.mjs mark` runs one topic.
  It answers the PlantUML server and the tweet / Bluesky scripts with stand-ins, so no network is needed.
- `tests/e2e/phase3.mjs` + `phase3/`: builds `tests/e2e/phase3/slides.md` and `layout/slides.md`, one file per topic (`sync`, `presenter`, `laser`, `drawing`, `camera`, `settings`, `drag`, `layout`), with Chromium's fake camera and microphone.
- `tests/e2e/dev-hmr.mjs`: dev server live-update check. `tests/e2e/dev-server.mjs`: starts the real dev server on a small deck: slide-ng-drag write-back, drawings, side editor, `{monaco-write}`, refused requests, and `--remote` with a password (HTTP, WebSocket, two browsers).
- `tests/e2e/phase4.mjs` + `phase4/`: the print route (`print.mjs`). `tests/export/` (`npm run test:export`): `run.mjs` (the export command on a deck: PDF, PNG, MD, PPTX, notes, outline, refusals), `build.mjs` (build, head tags, Open Graph picture, remote assets, download, offline worker, sub-path hosting, refusals), `theme.mjs` (the example theme, eject, `--theme`), `scaffold.mjs` (`create`, then format and build the new deck), `mcp.mjs` (a scripted client over stdio).
- `tests/e2e/screenshots.mjs` and `screenshots-features.mjs`: not tests; write `docs/screenshots/` (layouts, controls, and every feature slide).
