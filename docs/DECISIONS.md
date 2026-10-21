# Decisions

Short notes on choices made, and why. Newest at the bottom.

## Decided before phase 0

- **Plain Angular CLI, latest Angular, no meta-framework.** Fewest moving parts; the default application builder
  (esbuild) and AOT compile slides like any other component.
- **UnoCSS for styling**, Slidev's choice too, so utility class names carry over.
- **Fresh repo, not a fork of Slidev.** Slidev is Vue all the way down; a fork would carry code we do not use.
- **Use Slidev's `@slidev/parser`.** It already handles separators, frontmatter, notes and code fences correctly.
  MIT licensed; credited in README and NOTICE.
- **No converter for Vue syntax.** slide.ng has its own documented, Angular-flavoured syntax (docs/SYNTAX.md).
- **Readable code first.** Small files, short comments that say why, no framework dependencies beyond Angular.

## Made during phase 0

1. **Generator is plain `.mjs` Node scripts, not an Angular schematic or builder.** Easy to read and run;
   `npm run build` is just `generate` then `ng build`. The generated files are git-ignored.
2. **One component per slide, layout chosen at generation time.** The generator knows the layout, so it writes
   `<sn-center>...</sn-center>` and imports that layout. No runtime lookup is needed and AOT can check everything.
3. **Parser entry `@slidev/parser/core`**, not the root export: `core` has no file-system code, so the same
   function runs in the generator and in unit tests.
4. **Imports are decided by looking at the slide's HTML** (`scripts/lib/registry.mjs`), outside code samples.
   A standalone component must import what it uses, and unused imports produce Angular warnings. Adding your own
   component is one line in that table. Trade-off: it is a manual list, not auto-discovery.
   _Superseded:_ components in a `components/` folder are found by scanning (`scripts/lib/scan-roots.mjs`); the table lists only the built-ins, and you never edit it.
5. **Click attribute spelling: `slide-ng-click`, `slide-ng-after`, `slide-ng-click-hide`** (first written as Slidev's `v-click`, `v-after`, `v-click-hide`; see the last section), as inputs with aliases.
   Plain attributes give text (`slide-ng-click="+2"`); ranges need a binding (`[slide-ng-click]="[2,4]"`). The prototype used
   camelCase names; the dashed names are closer to Slidev and verified to work with Angular bindings.
6. **Code is protected twice**: entities for `{ } @` plus `ngNonBindable`. Entities alone are not enough, because
   Angular decodes them before looking for `{{`.
7. **A lone `@` or brace in normal text is escaped** instead of being an error, so prose like emails works.
   Angular blocks and `@let` must be on their own line.
8. **No per-slide `<script>` block.** Slides share state through template references and `@let`. A scripting
   story is a later phase.
9. **UnoCSS is run from `generate.mjs` with `@unocss/core`, not with the `unocss` command.** The Angular dev server
   does a full page reload whenever the UnoCSS command rewrites its output file (found by testing: 0 of 5 live
   updates). Writing the file only when its content changed gives 5 of 5. Output goes to
   `src/slides/generated/uno.css`, listed in `angular.json` `styles`. A PostCSS plugin was not tried.
10. **Canvas is 960 x 540** (16:9) and scaled with CSS `transform`, using Slidev's formula `min(w/width, h/height)`.
    Slidev's default is 980 wide; 960 is a rounder number and the exact value does not matter. (Replaced by owner decision 1: 980, as Slidev.)
11. **First slide defaults to `cover`**, like Slidev. `hide`/`disabled` remove a slide at generation time, so slide
    numbers in the URL count only visible slides.
12. **Unit tests use the runner `ng new` sets up (Vitest)**, with `include` extended to `scripts/**/*.spec.ts` and
    `allowJs` so TypeScript specs can import the `.mjs` generator code. Vitest isolates each file.
13. **Browser tests use `playwright-core`** as a dev dependency and a Chromium found through `CHROME_PATH`.
14. **Deck title** in the browser tab is the slide title plus the deck title (headmatter `title`).
15. **Zoneless Angular** (the current CLI default): signals drive the click state.
16. **Eager loading**: every slide is part of the main bundle. Lazy loading per slide is a later optimisation.

## Made during phase 1

1. **`src:` imports use `@slidev/parser/fs` (`load`) in the generator**, `parseDeck` is now async and reads files itself.
   The unit tests still run without files through its `sources` map. The headmatter title falls back to the first slide's title (Slidev does too).
2. **`defaults` from the headmatter are merged under every slide**, first slide included; a slide's own keys win.
3. **A layout's host element is its `.slidev-layout` root**, with Slidev's class names. The DOM matches Slidev (so docs like
   `.two-cols-header { ... }` work) and `class:` lands on the same element as in Slidev.
4. **Layout CSS is plain CSS** (`src/styles/layouts.css`), ported from Slidev's `layouts-base.css` and the default theme with the
   `@apply` lines written out. No UnoCSS transformer is needed and it reads like normal CSS. The Tailwind scale values are written as numbers.
5. **Frontmatter reaches a layout through a table** (`scripts/lib/layouts.mjs`: `props`, `classProp`, `slots`) instead of "everything".
   Layouts with a `class` prop in Slidev (`image-left`, `two-cols`, ...) get the frontmatter `class` as input `contentClass`, because an
   Angular input cannot be called `class`. `layoutClass` is an input of the two-columns layouts.
6. **Slot sugar becomes `<ng-container ngProjectAs="[name]">`**. A slot the layout does not have gives a generator warning and the text
   stays visible in the normal flow (Slidev would drop it silently).
7. **Per-slide `<style>`: Angular `styles` with `ViewEncapsulation.None`, wrapped in `slide-003 { ... }` (CSS nesting).** The slide's tag name is the
   scope, no extra attribute. Unlike Vue's scoped CSS it also reaches inside the layout's own elements, which is what the Slidev docs example needs.
   `--uno:` directives are not supported.
8. **`center` no longer centres the text** (phase 0 did). Slidev's `center` only places the content in the middle; use `class: text-center`.
9. **`full` has no padding.** Slidev's base style would give it the normal padding; the docs say "use all the space of the screen", so we follow the docs.
   This is the one layout where the two disagree; to be checked against a real Slidev (see STATUS).
10. **`<link>` is `<slide-ng-link>`**: `link` is a void HTML element and cannot hold content in an Angular template. Other built-ins keep their Slidev
    names in kebab case, with the `slide-ng-` prefix since the last section (`slide-ng-toc`, `slide-ng-current-no`, `slide-ng-total`, `slide-ng-light-or-dark`, `slide-ng-render-when`). Where Slidev uses Vue slots, we use
    attributes on children: `<div dark>` / `<div light>`, `<div fallback>`, `<div at="2">` inside `<slide-ng-switch>`.
11. **`slide-ng-render-when` has no `visible` context** (needs an element visibility observer); `slide`, `presenter`, `print`, `overview`, `main` work.
12. **`Nav` and `Ui` are provided by the Deck component**, not the root, so they can read the route and the slides created inside the deck inherit them.
    Overview thumbnails are created inside the overview component, which is inside the deck, so they see the same services.
13. **Shortcuts are a plain list**, with Slidev's names and keys (`next_space`, `prev_left`, ...), and a `SHORTCUTS_SETUP` injection token
    that gets the default list. We skipped Slidev's key auto-repeat timer (the browser's own key repeat is used) and typing digits in the overview.
14. **Transitions use the Web Animations API**, not CSS classes: no `*-enter-active` classes, so themes written for Vue's classes would not apply.
    The result is easy to test (`getAnimations()`) and needs no CSS. The setting of the earlier slide of the pair is used, like Slidev. Default: none.
15. **The bar at the bottom left shows on hover or focus** (CSS only, as in Slidev's play page). There is no idle timer: Slidev has none either.
    The user's wish for "auto-hide when idle" is met by the bar being hidden until the mouse goes to that corner.
16. **Dark mode** uses Slidev's storage key (`slidev-color-schema`) and values (`auto`, `light`, `dark`), the `dark` class on `<html>`, and hides the
    toggle when `colorSchema` is fixed in the headmatter. There is no inline script against a flash of the wrong colour on load.
17. **Overview thumbnails are real slide components** inside `@defer (on viewport)`, which is the lazy rendering. No image snapshots.
18. **Goto searches with a plain "number starts with / title contains" test**, not Fuse.js (one less dependency).
19. **The settings menu has Slidev's controls in Slidev's order** (filters, cursor style, slide scale, wake lock, hide idle cursor); the dark mode switch, camera options and PDF entry stay below a divider.
20. **An address that is not a number and not a `routeAlias` shows the `404` layout**; numbers still clamp to the first and last slide (as in phase 0).
    The `error` layout exists but nothing shows it yet.
21. **Icons from `@iconify-json/carbon` through UnoCSS `preset-icons`**, built into the CSS file by the generator (only used icons are included).
    `@unocss/reset` is imported like Slidev does, so layouts start from the same plain page.
22. **Two browser test decks**: the starter deck (`slides.md`, phase 0 tests) and `tests/e2e/showcase/slides.md` (phase 1 tests), built with
    `SLIDES_FILE` into separate folders. `npm run screenshots` writes `docs/screenshots/` from the second one.
23. **The readout `#hud` stays** (tests read it) but is hidden from the eye.
24. **`@types/node`** was added as a dev dependency so the unit tests can use `node:fs` for the `src:` tests.

## Made during phase 2

New dependencies, each with its reason (dev = only used while generating or testing, not in the browser bundle):
`shiki` (dev, highlights code while generating), `katex` (dev, math to HTML while generating; its CSS is added only when used),
`@iconify-json/mdi` and `@iconify-json/ph` (dev, icon data for the generator), `@shikijs/magic-move` (the animation of Magic Move; lazy),
`mermaid` (diagrams; lazy), `monaco-editor` (editor; lazy), `rough-notation` (the `slide-ng-mark` drawings; lazy).
Nothing else was added: footnotes, alerts, the PlantUML encoding and the code runner are small hand-written pieces.

1. **Code is highlighted while generating, and the browser gets finished HTML.** Shiki runs in `scripts/lib/code/highlighter.mjs` with both
   themes (`vitesse-light`, `vitesse-dark`, Slidev's defaults) written as CSS variables; `src/styles/code.css` picks one by the `dark` class.
   Headmatter `shiki: { themes: { light, dark } }` changes the themes and `codeAliases: { name: shikiName }` adds language names.
2. **The languages are found before generating** (`features.mjs` scans fences and `<<<` lines), so the highlighter can be synchronous and
   `toTemplate` stays a plain function. A language Shiki does not know is shown as plain text with a warning.
3. **Line highlights are done in the browser, not in the HTML.** The generator writes the ranges as an attribute (`ranges="2-3|5|all"`) and
   `<slide-ng-code-block-wrapper>` toggles `highlighted` / `dishonored` classes from the click number, which is Slidev's design. One code path serves
   static `{2,3}` and click-stepped ranges. A static highlight appears on the first rendered frame after the component starts, not in the HTML.
4. **Fence options are written as plain attributes** (`lines="true" startLine="5" maxHeight="100px"`) and read with Angular's attribute
   transforms. The options text `{lines:true,maxHeight:'100px'}` is read by a small parser (numbers, booleans, quoted text and bare words),
   not evaluated as JavaScript as Slidev does.
5. **`@/` in `<<<` is the folder of the entry markdown file**, like Slidev's `userRoot`. A missing snippet file is a warning plus a visible
   comment inside the block, so one typo does not stop the build.
6. **`::code-group` takes the fences inside it and ignores the text between them.** Tab names are the `[titles]`; the title bar of the single
   blocks is hidden inside a group. Slidev's automatic file icons (vscode-icons) and the `~icon~` title syntax are not drawn.
7. **Fences are found by a small line scanner** (`fences.mjs`) instead of a regular expression, so four backtick fences can hold three backtick
   ones (needed for Magic Move) and `<<<` / `::code-group` are handled in the same pass.
8. **The deck for the phase 2 tests is `tests/e2e/phase2/slides.md`**, next to the phase 1 showcase, with its own runner (`npm run test:e2e`
   runs all three decks). It is the showcase deck the task asks for; the starter `slides.md` stays small.
9. **Magic Move uses `@shikijs/magic-move`** (the package `shiki-magic-move` was renamed; same code, matches Shiki 4). The generator
   tokenises each step (`toKeyedTokens`), compresses the JSON with Node's zlib and writes it into a `steps` attribute. The component unpacks it with
   the browser's `DecompressionStream`, then drives the library's plain DOM renderer (`MagicMoveRenderer`) and `syncTokenKeys`, both loaded with
   dynamic `import()` so they are separate chunks. No lz-string dependency.
10. **A magic-move step's `<<<` snippet lines work** because the inner blocks are read by the same fence scanner.
11. **KaTeX is drawn while generating**, as `output: 'html'` (no MathML), because Angular rejects MathML-only tags such as `<annotation>`.
    The TeX source is added as visually hidden text (`sr-only`) for screen readers instead. Output is wrapped in `ngNonBindable` and has
    `{ } @` as entities. `katex.min.css` (with its fonts) is imported through `src/slides/generated/features.css`, which the generator fills only when a
    deck has math, so other decks carry no KaTeX at all.
12. **Math is cut out of the markdown before Angular syntax is hidden**, so a line that is only `}` inside a formula is not taken for the end of an
    `@if` block. The cost: `{{` inside `$...$` is math, never an interpolation. `$5 and $10` is text (the same rule as Slidev: no space after the opening
    `$`, none before the closing one, and the closing one is not followed by a digit).
13. **Range handling shared by code and math** lives in `code/ranged-block.ts` (`ranges`, `at`, `finally`, `startLine`, `hide`); `CodeBlockWrapper`
    and `KatexBlockWrapper` extend it. `mhchem` (chemistry) is not loaded.
14. **Mermaid is drawn in the browser with `import('mermaid')`**, one diagram at a time (a promise queue), with a cache so overview thumbnails
    do not draw it again. The diagram text travels as a packed attribute (`packed`), because Mermaid syntax has `{{ }}`. `<slide-ng-mermaid code="...">`
    takes plain text for direct use. Options: `scale`, `theme` (no theme means `dark` or `default` following the colour mode, as in Slidev) and any other
    key is passed to `mermaid.initialize` (`config`). The SVG is put in the page directly (not in a shadow root), which keeps CSS simple.
    Mermaid pulls in CommonJS packages; they are listed in `allowedCommonJsDependencies` in `angular.json` to keep the build output free of warnings.
15. **`data-slide-ng-waitfor`** is on a diagram's element while it is still being drawn; its value is the selector that will exist when it is done
    (as Slidev's `data-waitfor` does for its exporter). The attribute is removed when the picture is ready, so "no element has the attribute" means the
    slide is ready for export. (Export itself is a later phase.)
16. **PlantUML is an `<img>`** from `plantUmlServer` (default `https://www.plantuml.com/plantuml`). The generator encodes the text (deflate plus
    PlantUML's base64 alphabet, 15 lines instead of the `plantuml-encoder` package). The deck needs the network for the picture, as in Slidev.
17. **Monaco is bundled by the Angular builder itself, and works offline.** `src/app/code/monaco/setup.ts` is loaded with `import()`;
    it starts Monaco's two workers with `new Worker(new URL(...))` (editor worker and TypeScript worker, small files in `src/app/code/monaco/`),
    which Angular's esbuild builder compiles into separate `worker-*.js` files (`webWorkerTsConfig` in `angular.json`). No AMD loader, no CDN.
    JSON, CSS and HTML get colours but no language server (no workers for them, to keep the output smaller). Setup needed in `angular.json`:
    `"loader": { ".ttf": "file" }` (the icon font) and `webWorkerTsConfig`.
18. **`tsconfig.app.json` lists only `src/main.ts`** (no `include`), so only files the deck imports are compiled. Without this the builder
    found the `new Worker(...)` calls in every file and put 7 MB of workers into every build, also decks without an editor.
19. **Monaco's CSS goes through `features.css` (by path, with its icon font inside) when the deck has an editor.** The CSS that Monaco's JavaScript
    imports is written next to the output as unused `.css` files (about 190 kB each, not linked). Mapping `.css` to `empty` in `angular.json`
    removed them but broke the unit tests, so they stay. Editors use Monaco's own `vs` / `vs-dark` themes following the colour mode, not the Shiki
    themes (that would need `@shikijs/monaco`, one more dependency).
20. **`{monaco-run}` runs code in a sandboxed `<iframe srcdoc sandbox="allow-scripts">`** (no `allow-same-origin`): it cannot reach the slides,
    their storage or cookies; it posts back what `console.log` printed. A run is cut off after 5 seconds. TypeScript is turned into JavaScript by
    Monaco's own TypeScript worker, so the 9 MB `typescript` package is not added a second time. Not supported: `import` in the code (Slidev maps a few
    modules), highlighting of the output (Slidev uses Shiki in the browser), custom runners for other languages.
21. **Keys typed inside a Monaco editor are not shortcuts.** The editor's input is a plain `div`, so the check for text fields in `deck.ts` also looks
    for `.monaco-editor`.
22. **Options after `{monaco}` are flat** (`{autorun:false,showOutputAt:'+1',height:'auto',lines:true,readonly:true}`); `editorOptions` (a nested object) is not read.
    `{monaco-write}` showed an editor without saving in phase 2; phase 3 made it save (see phase 3, decision 17).
23. **Twoslash works, done while generating** with `@shikijs/twoslash` (dev dependency, `explicitTrigger`: only fences with the word `twoslash`
    after the language, as in Slidev). TypeScript worked out the types at generation time, and the popups are CSS only (`style-rich.css` through
    `features.css`), so no TypeScript reaches the browser. It starts a TypeScript program (about one second) only when the deck has a twoslash block.
    A block that fails to compile is shown without types and a warning. Such blocks do not scroll (`overflow: visible`) so popups are not clipped.
    Imports of packages the deck does not install (`import { ref } from 'vue'`) cannot be typed, as in a normal TypeScript program.
24. **Built-in components keep Slidev's names in kebab case** (with the `slide-ng-` prefix since the last section): `<slide-ng-arrow>`, `<slide-ng-auto-fit-text>`, `<slide-ng-transform>`, `<slide-ng-youtube>`, `<slide-ng-tweet>`, `<slide-ng-blue-sky>`,
    `<slide-ng-video>` (Slidev: `SlidevVideo`; `slide-ng-video` keeps clear of `<video>`), `<slide-ng-code-group>`, `<slide-ng-monaco>`, `<slide-ng-mermaid>`, `<slide-ng-plant-uml>`. Multi-word
    inputs that people write in HTML are dashed, like `slide-ng-click`: `two-way`, `multi-line`.
25. **`<slide-ng-auto-fit-text>` has no `fitty` dependency.** It tries font sizes between `min` and `max` by halving until the text fits the box's width (and its
    height, when the box has one). A box with no height only limits the width. It fits again when the box is resized and when web fonts have loaded.
26. **`<slide-ng-video>` finds out when it is shown** from the slide number and from a `slide-ng-click` on the same element (it injects the `slide-ng-click` directive),
    instead of Slidev's global map of click elements. `autoplay`, `autoreset`, `poster`, `timestamp` and `controls` work; the `print*` props do not (no print mode yet).
    In overview thumbnails it never plays.
27. **`<slide-ng-tweet>` and `<slide-ng-blue-sky>` load the sites' own embed scripts** (`platform.twitter.com/widgets.js`, `embed.bsky.app/static/embed.js`) when the component starts,
    so these two need the network at presentation time. The tests answer both scripts with small stand-ins and check the markup and calls. A Bluesky post
    address is turned into an `at://` address with Bluesky's public API, as in Slidev. The Bluesky placeholder uses a Carbon icon (the `simple-icons` set is not installed).
28. **`slide-ng-mark` modifiers are rewritten by the generator.** Angular cannot match `slide-ng-mark.red.circle` as a directive, so `scripts/lib/directives.mjs` turns it into `mark-mods="red.circle" slide-ng-mark="..."`. An object or range value (`slide-ng-mark="{ at: 2 }"`, `slide-ng-mark="[2, 4]"`) becomes a binding, so Slidev decks keep working. Colours are Tailwind 500 hex values set on rough-notation, not `text-*` classes. `.delay300` is done with a timer, because rough-notation 0.5 has no delay option (Slidev uses its own fork). The drawing is un-scaled by CSS (`--slidev-slide-scale`), because rough-notation measures in screen pixels; stroke width therefore does not follow the slide scale.
29. **`slide-ng-motion` is a small CSS-transition directive**, not @vueuse/motion (no new dependency). `:initial`, `:enter`, `:leave` and `:click-N` / `:click-N-M` are collected by the generator into one `[slide-ng-motion]` object, since Angular has no dynamic input names. Variants may use x, y, scale, scaleX, scaleY, rotate, opacity, any other CSS property, and `transition: { duration, delay, ease }`. A `slide-ng-click` on the same element drives initial / enter / leave. Springs, `hovered`, `tapped`, keyframe arrays and `variants` are not supported (a warning is printed while generating).
30. **Click numbers of `slide-ng-mark` follow `slide-ng-click`.** A bare `slide-ng-mark` is `+1`; `true` always shows, `false` never. In print and overview the end state is not yet special-cased for marks (NOT VERIFIED).
31. **GitHub alerts, footnotes and task lists have no markdown plugin.** Alerts are found in the HTML that `marked` makes (`alerts.mjs`, handles nested quotes), with Carbon icons; footnotes are cut out and written back by `footnotes.mjs` (numbers are plain superscripts, not links, because a `#fragment` link would make the router leave the slide). Task lists are `marked`'s own checkboxes, styled in `src/styles/markdown.css`. The one limit: footnote notes are inline markdown only (no paragraphs or lists inside a note).
32. **Icon tags are rewritten for every installed `@iconify-json/*` set** (`icons.mjs`; the longest set name wins), so adding a set is `npm i -D @iconify-json/<set>` and nothing else. UnoCSS only makes CSS for class names it can see, so the generator now also scans the generated slide files.
33. **Alert colours are GitHub's**, set as CSS variables per kind in `markdown.css`, with a dark variant.

## Made during phase 3

New dependencies, each with its reason: `drauu` (drawing; the brief named it; lazy chunk, only loaded when the toolbar is first opened),
`ws` (dev only: WebSocket server of the companion server; it was already installed through other packages and is now declared),
`@types/ws` (dev: types for the server tests), `yaml` (dev: edits a slide's frontmatter and keeps its comments; the parser already needs it).
Nothing else: recording uses the browser's MediaRecorder, the wake lock uses the browser's Wake Lock, sync uses BroadcastChannel and a plain WebSocket.

1. **Sync is one signal service and a transport interface.** `SyncState` holds `shared` (page, clicks, timer, cursor) and `drawings`. It only knows
   `SyncTransport { send, listen }`; BroadcastChannel and the dev WebSocket are two providers of the multi token `SYNC_TRANSPORTS`. Both can run at once; messages are idempotent, so a double delivery is harmless.
2. **Presenter drives, viewers follow.** The presenter page sends page and clicks; a viewer applies them. A viewer that moves by itself on a local address (localhost, same browser) moves the presenter back,
   so two windows of one person never fight; a viewer on another device only follows. A page that opens late asks with `hello` and the presenter answers with its last move, keeping that move's time; a viewer ignores a move older than the one it follows, so with two presenter windows the audience stays with the newest move. A presenter page's first position after it opens is not a move: it goes out with time 0, or after a reload with the time of that tab's last move (`sessionStorage`). A move carries the sender's clock (`sentAt`) like the timer, and its time is moved onto the receiver's clock before it is compared. Everything received is cleaned (`cleanShared`): counts must be integers from 0 to under 1e6, drawings at most 500 000 characters.
3. **`/presenter/:no`, `/notes` and `/:no` are separate routes** and `route.data.mode` tells `Nav` which navigation it serves. The three presenter layouts are Slidev's CSS ported; the choice, the notes font size and the cursor options are remembered in `localStorage` under Slidev's keys.
4. **The timer is shared state**, not a local clock: `{ status, startedAt, pausedAt }`, so every window shows the same time. A message carries the sender's clock (`sentAt`) and the times are moved onto the receiver's, so devices with clocks that differ agree; every window answers a `hello` with a running timer, and the dev hub keeps the last one. `duration` (`30min`, `1h30min`, `90s`, a number of minutes) and `timer: countdown | stopwatch` are headmatter.
5. **Cursor and laser are drawn on the viewer's page** from the presenter's position in slide coordinates, throttled to one send per animation frame, newest position wins.
6. **Drawings:** one `drauu` instance per page, markup kept in `SyncState.drawings` per slide. Persisted in `localStorage` (`slide-ng-drawings`); with `drawings.persist` the dev server also writes `.slide-ng/drawings/<n>.svg`, and the generator bakes those files into the build.
   `enabled` may be `dev` or `build`; `presenterOnly` hides drawing from viewers; `syncAll: false` keeps viewer drawings on the viewer's screen. Everything read from another window or a file is sanitised (`cleanSvg`, a tag whitelist) before it is shown. The saved SVG file has a fixed viewBox of 960x540 (not the headmatter canvas size).
7. **Recording uses MediaRecorder** (webm, vp9 then vp8 then the browser's choice). `screen` records this tab through `getDisplayMedia`, `camera` records the camera; the microphone is added to both. One file per recording, downloaded when you stop. `fix-webm-duration` was **not** added: the file has no duration field, so some players show it only after a seek. (Replaced by owner decision 5: the duration is written, as Slidev does.)
   `record: true | false | dev | build` (default `dev`, like Slidev) decides whether the camera, record buttons and device options exist at all.
8. **The camera bubble and the screen mirror are small components** (`WebCamera`, `ScreenMirror`); the mirror hides the slide with `display: none`, never removes it, so the click state survives. Device choices are remembered under `slidev-camera`, `slidev-mic`.
9. **Settings menu:** dark mode, slide scale, idle cursor, wake lock, presenter cursor and style, five colour filters (applied to the main slide only, not to thumbnails), camera options, and a **disabled** "Download as PDF" entry (export is not done). The wake lock follows headmatter `wakeLock: true` until the user chooses; the choice wins.
10. **`slide-ng-drag` numbers each site in the generator.** `scripts/lib/drag-sites.mjs` finds `slide-ng-drag` tags outside code and the generator adds `drag-site="N"`; the dev server uses the same function on the same text, so "site 3" means the same thing on both sides.
    Forms: `slide-ng-drag="[x,y,w,h]"`, `slide-ng-drag="name"` (numbers in frontmatter `dragPos`), bare `slide-ng-drag` (starts where the layout put it, becomes absolute on the first move), `<slide-ng-drag pos="x,y,w,h">`, `<slide-ng-drag-arrow pos="x1,y1,x2,y2">`.
    Written back as `[x,y,w,NaN]` in the attribute form and `x,y,w,_` in `pos` and frontmatter (`NaN` / `_` = height follows the content), whole numbers only. Resizing ignores the rotation (it works in the unrotated frame). Arrow keys nudge 1 px, with Shift 10 px, and the arrows stop moving slides while an element is selected.
    A static build keeps a move only while the page stays open; it never writes.
11. **`zoom`** scales the layout from the top left corner (width and height divided by the zoom, then `transform: scale`), frontmatter over headmatter. **The default canvas stays 960x540** (phase 1 choice; Slidev's is 980x552; replaced by owner decision 1); `canvasWidth` and `aspectRatio` change it.
12. **Layers are files:** `src/app/layers/{global-top,global-bottom,slide-top,slide-bottom}.ts`, each with `export default` of a standalone component. The generator imports those that exist into `generated/layers.ts`. Global layers sit once over or under the slides; slide layers are inside every slide. They let clicks through (`pointer-events: none`) and are not drawn in overview thumbnails or the next-step preview.
13. **`routerMode: hash`** uses Angular's hash location; `history` (default) needs a host that sends every path to `index.html`.
14. **The dev companion server is a separate process** (`scripts/dev/server.mjs`), started by `npm start`, bound to **127.0.0.1 only**. The Angular dev server proxies `/__slide-ng/*` to it (`proxy.conf.mjs`), WebSockets included, so the page uses one origin. Even with `--remote` it is only reachable through that proxy, with the same checks.
15. **Security rules of the companion server** (all in `scripts/dev/auth.mjs`, each tested): (a) `Host` must be localhost, or with `--remote` an IP address or the machine's name (stops DNS rebinding); (b) a present `Origin` must equal `Host`; (c) every write and WebSocket needs the session token (random per start, given by `/session`); (d) with a password, also a cookie that is only given for the right password (`HttpOnly`, `SameSite=Strict`, compared in constant time, 400 ms delay on a wrong one);
    (e) writes need `Content-Type: application/json`; (f) a request never supplies a path: slides are found by number through the parser, drawing files are `<integer>.svg`, `{monaco-write}` files come from a list the generator wrote, and every path goes through `confine` (no `..`, no absolute path, no symlink out, inside the deck's folder);
    (g) body limits (slide edits 500 KB, drawings 500 KB, moves 2 KB) answer 413 and hang up; (h) the WebSocket hub passes only `{channel, data}` for three known channels, closes connections over 600 KB, and a bad client cannot stop it; (i) drawing markup must be drawing shapes only (no scripts, handlers, links).
16. **`--remote` always has a password.** `--remote=secret` or, when none is given, a random one is made and printed with the LAN address and the presenter URL (`?password=...`). The page logs in with it, then removes it from the address bar. Without `?password=` the page asks once with a prompt. There is no HTTPS, so on an untrusted network the password and slides cross it in the clear.
17. **`{monaco-write}`** works for `<<< ./file.ts {monaco-write}` (a whole file inside the deck's folder). The generator lists `{ id: path }` in `.slide-ng/monaco-files.json`; the page sends only the id. A region, a plain code block or a file outside the folder gets a warning and a normal editor. The text is saved 600 ms after typing stops.
18. **The side editor is a plain textarea** (colouring added by owner decision 6), not Monaco: it needs no extra loading and cannot fail on a scaled canvas. It shows the raw slide (frontmatter, content, notes) and saves 600 ms after typing. It does not notice edits made elsewhere while it is open (reopen or change slide). Its open state is kept in the browser because a rebuild can reload the page.
19. **Test decks:** `tests/e2e/phase3/slides.md` (presenter, sync, drawing, camera, settings, drag), `tests/e2e/phase3/layout/slides.md` (hash routing, canvas size, zoom and the four layers, which live in its own `layers/` folder), `tests/e2e/dev/slides.md` (copied to `work.md` for the dev-server test).

## Made during phase 4

The person was away, so these were decided without asking. Each one can be changed; the reasons are here so that it is clear what to argue with.

New dependencies, each with its reason:
`playwright-core` (export and the Open Graph picture drive a Chromium; it was a dev dependency, now a normal one; it never downloads a browser, `--executable-path` or `CHROME_PATH` names the one to use),
`pdf-lib` (joins one PDF page per slide, sets the title and writes the outline; Chromium can do neither), `pptxgenjs` (the only part of the PPTX format the exporter needs: pictures and notes),
`@modelcontextprotocol/sdk` and `zod` (the protocol and its schemas; `zod` is the SDK's own required peer, so it is declared). The generator, the dev server and the exporter now run from an installed
package, so `@angular/build`, `@angular/cli`, `@angular/compiler-cli`, `typescript`, the UnoCSS and Shiki packages, `katex`, `yaml`, `ws`, `playwright-core` and the Iconify sets moved from
`devDependencies` to `dependencies`. Only test tools stay as dev dependencies. Nothing else: the static server, the flag reader, the head templating, the offline worker and the zip of the scaffold are
plain Node.

1. **Print route contract.** `/print` is a page of its own (not a mode of the deck page) with `.print-slide-container` ids `<slideNo>-<clickN>`, `?print=clicks` for one page per click step and `?range=`.
   `data-slide-ng-print="ready"` says the page is done; lazy components keep `data-slide-ng-waitfor` until they are drawn, so an exporter never needs a fixed delay. The notes have `/presenter/print`.
2. **Export goes through a real browser and the print route**, one PDF page per slide or click step (`page.pdf` with the canvas size and `preferCSSPageSize`), merged with `pdf-lib`. PNG, Markdown and
   PPTX use screenshots of the same pages. PPTX holds pictures and notes; **editable PPTX is out of scope** (STATUS.md). The outline is written by hand into the PDF (`--with-toc`).
3. **A deck can not choose what runs or where files go.** `exportFilename` is turned into a plain file name (no separators, no `..`, no leading dot); `executablePath` and `output` in the headmatter are ignored;
   `--output` names files in the current folder, or a folder the exporter creates itself, and the exporter only ever deletes files it wrote in a folder it made. Tests try `../../../x`, absolute names and an existing folder.
4. **Build = `ng build` into a work folder, then copy.** `slide-ng build` builds into `<deck>/.slide-ng/build`, makes the extra files (picture, PDF, `404.html`, `_redirects`, offline files), and copies the result into `--out`.
   `--out` is only replaced when it is empty, absent or carries `.slide-ng-build`; the current folder and folders with other files are refused before the long build starts. The work folder is removed afterwards.
5. **`--base` goes through `--base-href` and `routerMode`.** With history routing a host must send every path to `index.html` (`404.html` and `_redirects` are written for GitHub Pages and Netlify); `routerMode: hash` needs nothing. docs/HOSTING.md.
6. **Head tags are templated into a copy of `src/index.html`** (`generated/index.html`) with every value escaped and attribute names checked. `ogImage: auto` makes a screenshot of slide 1 (1470x828, the canvas at scale 1.5) during the build;
   a path or an address is used as given. `info` is the description, `titleTemplate` uses `%s`.
7. **`remoteAssets: true` downloads pictures at build** (images only, `image/*` content type, 20 MB at most, named by a hash) and rewrites the slides to use the copies. Not in dev, so the dev server never needs the network for it.
8. **The offline worker is written by hand** (`sw.js`, written by `build/pwa.mjs`): a cache named by a hash of the file list, files from the build only, the PDF left out, cache first (a miss goes to the network, and a page navigation falls back to the cached `index.html`). It is registered only in production builds
   (`pwa: true`).
   **Icons and indicator (later):** `build/pwa-icons.mjs` draws `pwa-icon-192.png`, `pwa-icon-512.png` and `pwa-icon-maskable-512.png` with the Chromium the exporter already uses (no new dependency), from `public/icon.png`,
   `public/icon.svg`, a local `favicon` of `public/`, or the slide.ng icons in `build/default-icons/` (copied as they are, no browser needed; they used to be a dark square with the first letter of the title). A build without a browser warns and has no icons instead of failing for a picture of your own. The worker's list picks the icons up
   like any file. `ui/offline-badge.ts` shows "Available offline" (the worker is active, which means it has stored everything) or "Offline" (`navigator.onLine`) in the corner of the deck; it is absent in dev, the print route and without `pwa`.
9. **The download button is disabled unless the PDF exists.** The page asks for the file with a HEAD request, so `npm start` and builds made without `--download` show a greyed entry with a hint instead of a dead link.
10. **Build budgets raised** to 1 MB warning and 2 MB error for the first load. A deck with Monaco and KaTeX is about 850 kB, which is over the old 500 kB warning (1 MB error).
11. **One package, not a monorepo.** This repository is the package: `bin/slide-ng.mjs`, the generator and the app sources, and `template/` for `slide-ng create`. A monorepo with a separate `create-slide-ng` and a theme package
    would need a registry, workspaces and release tooling that nothing here can test. `create` copies `template/` and fills the name and version; the new deck's `package.json` depends on `slide-ng`. The package is still `private`
    (nothing is published by this work); an open decision.
12. **A deck outside the repository builds in a working copy of the app** (`<deck>/.slide-ng/app`, from `cli/app-root.mjs`): a fresh copy of `src/`, the Angular and TypeScript settings and `public/`, with `node_modules` linked from the
    package. The package folder is never written to. A deck inside the repository (`npm start`, the tests) builds in place. A copy is slower to start than in place; the Angular cache in the copy is kept between runs.
13. **The scaffold is tested without a registry.** `tests/export/scaffold.mjs` runs `create`, links the repository as `node_modules/slide-ng` in the new deck (what `npm install` would do) and builds it from there. A real `npm install slide-ng` from a registry was not tried.
14. **Roots, in this order: built-in theme, `theme:`, each `addons:`, the deck's own folder; later wins.** A root is a folder with any of `layouts/`, `components/`, `layers/`, `styles/index.css`, `public/`, `setup/providers.ts`,
    `uno.config.mjs`, `theme.json`. Details in docs/THEMES.md. The roots are copied into `src/slides/generated/roots/<id>/` (symbolic links are never followed or copied) so that Angular compiles them with the rest and a theme in
    `node_modules` can import `@angular/core`.
15. **Theme code reaches the app through `slide-ng/*`** (a TypeScript path to `src/app/*`) instead of `../`, because it is copied. The built-in layouts have no `../` imports, so `theme eject` copies them as they are.
16. **Layouts and components are found by reading the file as text** (a `@Component({ selector: '...' })` followed by `export class`), like the built-in registry did by hand. A layout that replaces a built-in one keeps its inputs; `theme.json`
    changes them. Angular decorators are not parsed, so inputs are never read from the component.
17. **An unknown theme package is a warning, not an error** (the built-in theme is used), because decks written for other themes should still run. A path that is not a folder is an error. `--theme`/`-t` and `SLIDE_NG_THEME` override the headmatter.
18. **Setup hooks are Angular providers** (`setup/providers.ts`, an array). Shortcuts use the existing `SHORTCUTS_SETUP` token (one wins: the last root), code runners use the new multi token `CODE_RUNNERS`. There are no hooks for Shiki,
    KaTeX, Mermaid, Monaco or the markdown pipeline; that is the second biggest gap in PARITY.md.
19. **One example theme, `examples/theme-minimal`**: replaces `cover` and `quote`, adds `<minimal-callout>`, CSS, a UnoCSS shortcut, `colorSchema: dark` and `transition: fade` as defaults and a `b` shortcut. No community theme was ported.
20. **The dev server is one command with several processes** (`cli/dev.mjs`): the generator in watch mode, the companion server and `ng serve`. `npm start` is the same code. `--port` (default 4230), `--open` (`ng serve --open`), `--remote[=password]`,
    `--bind`, `--theme`, `--log` (`error`/`silent` hide the output of the child programs), `--force` (clears the build cache). `--tunnel` (needs a tunnel service) and `--base` are refused with a message instead of being ignored.
    `--remote` is an optional-value flag: it never takes the next argument, so `slide-ng --remote my.md` means what it says.
21. **`slide-ng mcp`** has seven tools: `list_slides`, `get_outline`, `get_slide`, `update_slide`, `insert_slide`, `remove_slide`, `move_slide`. They read with the generator's parser and edit slides.md as text. Every edit is parsed
    again in memory first; if any other slide would change, nothing is written. Slide 1 carries the headmatter, so it cannot be removed or moved and nothing can be put before it. Insert, remove and move work on decks whose slides are all
    in the entry file; `update_slide` also works on an imported file, but only inside the deck's folder (the same `confine` check as the dev server).
22. **`replaceSource` keeps the blank line under a plain `---`** (a bug found while writing the MCP tests: replacing a slide that has no frontmatter with text that starts directly at the top made the parser read the text as frontmatter).
    The dev server's side editor gets the fix too.
23. **The side editor looks at the file every two seconds** while it is open and nothing typed is waiting to be saved, and takes over a change made elsewhere (another editor, git, the MCP server). A poll, because the dev server has no file
    watcher channel to the page; the cost is one small request per two seconds while the editor is open.
24. **Two phase 3 limits were smaller than written:** `slide-ng-drag` boxes are drawn in the right place in overview thumbnails (they are only not editable there), and the presenter's next-step preview now draws the global layers. Slidev does not draw global
    layers in overview thumbnails either, so they were left out there.
25. **The four layer files of the layout test deck live in its own folder** (`tests/e2e/phase3/layout/layers/`) instead of being copied into `src/app/layers` during the build; that is the deck-folder feature doing the job.
26. **Left out on purpose:** editable PPTX, the prettier plugin, the Vue-syntax converter, community themes, the browser exporter page and `overviewSnapshots` (as asked; the VS Code extension was left out of the core and became the separate slide-ng/vscode-extension repository). Also left out because they would not fit: `--tunnel`,
    Monaco type loading, `fonts`, MDC/Comark.

### Open decisions (for the person to settle)

- Publish `slide-ng` to a registry (remove `private`, choose a version scheme)? Until then `create` writes `"slide-ng": "^0.0.0"`, which only resolves with a link or a local tarball.
- Default canvas width: settled, it is Slidev's 980 (owner decision 1).
- Default dev port: decided by the owner: 4230 (not Angular's 4200, not Slidev's 3030).
- Should an uninstalled theme be an error instead of a warning?
- Add setup hooks for Shiki, KaTeX, Mermaid and Monaco, or keep themes to layouts, components, styles and providers?
- PWA icons and an "available offline" indicator.

## Owner decisions (align with Slidev)

The owner decided "do it like Slidev" for every open choice. For each one, Slidev's source (v53) was read first; what it does is written here.

1. **Canvas default is Slidev's: 980 wide, 16/9, height rounded up (552).** Slidev: `packages/parser/src/config.ts` (`canvasWidth: 980`, `aspectRatio: 16 / 9`),
   `packages/client/env.ts` (`slideHeight = Math.ceil(width / aspect)`, so a printed page never gets an extra blank page). `readCanvasSize` (app) and `canvasSize`
   (generator, dev server) follow the same rule; the saved drawing files and the drawing preview use the canvas size instead of a fixed 960x540. Tests: `canvas.spec.ts`,
   `canvas-size.spec.ts`, `drawings.spec.ts`, the PDF page size (735x414 pt), PNG size, print page size and the 1:1 scale check in the browser tests.
2. **A theme or addon that is not found is an error, like Slidev's resolver** (`packages/slidev/node/resolver.ts`, `createResolver`). Slidev looks for `@slidev/theme-name`,
   `slidev-theme-name`, then `name`; slide.ng looks for `@slide-ng/theme-name`, `slide-ng-theme-name`, then `name` (see 10). Not found: in a terminal it asks "install it now?" and runs the package manager; without a terminal it exits
   with an error. slide.ng does the same and the error carries the install command (`npm install -D slide-ng-theme-x`, or `@slide-ng/theme-x` for an official name; or `pnpm add -D` / `yarn add -D` / `bun add -d` by the lock file in the deck's
   folder). The question is only asked on the first generator run (not in watch mode, not in CI). Also like Slidev: a name with a slash that does not start with `@` is a path, `@/x` is relative
   to the deck's folder, and a name that is not a valid npm package name is refused. Tests: `roots.spec.ts`, `install-root.spec.ts`, `tests/export/theme.mjs` (the build stops, names the command, writes nothing).
3. **`--remote` works like Slidev's: the password is optional.** (Overridden later: see "Made while fixing the security review", decision 1.) Slidev (`packages/slidev/node/cli.ts`): `--remote` is a string option; `--remote` alone means no password, `--remote=secret` sets one;
   the host becomes `--bind` (default `0.0.0.0`) only in remote mode; the start-up message lists the public show, the private one (with `?password=`), the presenter and the network addresses.
   slide.ng does the same (`cli/dev.mjs`, `cli/remote-info.mjs`). Remote mode without a password prints a warning (no password, no HTTPS) and keeps every other rule of the dev server: Host
   must be localhost or an address, a present Origin must equal Host, every write and WebSocket needs the session token, a request never names a path and every path is confined to the deck's folder.
   Where slide.ng is stricter than Slidev on purpose: with a password the whole companion server (sync and writes), not only the presenter pages, needs it. The random password of phase 3 is gone.
   Tests: `dev.spec.ts`, `remote-info.spec.ts`, `server-remote.spec.ts`, and `tests/e2e/dev-server.mjs` (a real `--remote` server with no password: session without login, refused token-less write, refused foreign Origin).
4. **The 21 layouts follow Slidev's root classes and CSS.** Read: `packages/client/layouts/*.vue`, the default theme's six layouts (`themes/packages/theme-default`), `layouts-base.css`. Differences found and fixed:
   `full` kept padding 0 (Slidev: the normal `px-14 py-10`; its docs' "all the space" is only `w-full h-full`); `h1` was bold (Slidev's reset gives the normal weight; `fact`, `statement` set 700 themselves);
   a `blockquote` had a margin (Slidev: none); the table and `kbd` border colour was grey 128 (Slidev's `border-main` is `rgb(156 163 175 / 0.2)`); `none` was an inline element (Slidev wraps in a div);
   the `error` layout text now is Slidev's (terminal text with a dev server, network text in a build); `/image.png` in `image`, `image-left`, `image-right` and `cover` gets the deck's base in front, like `resolveAssetUrl`;
   right-to-left rules added. Everything else matched. Test: `layout-classes.spec.ts` lists all 21 layouts with Slidev's classes; the showcase test checks `full` padding in the browser.
5. **Recording: Slidev does fix the webm duration, so slide.ng does too.** Slidev (`packages/client/logic/recording.ts`) records with RecordRTC (MediaRecorder underneath), which gives a webm without a Duration,
   and then calls `fixWebmDuration` from `@fix-webm-duration/fix` with the measured time before the download. slide.ng measures the recorded time (pauses not counted) and `record/webm-duration.ts` writes a Duration element
   into the file's Info block (about 100 lines instead of a dependency; any layout it does not understand leaves the file untouched). Not done and still listed in PARITY.md: Slidev also saves a separate camera file, and has mp4/mkv
   mime types, frame rate, bit rate and resolution settings. Tests: `webm-duration.spec.ts` (synthetic files), and the camera browser test (the downloaded file has a Duration, `ffprobe` reads its length).
6. **The side editor is Slidev's kind: a plain textarea with Shiki-coloured markdown behind it.** Slidev (`packages/client/internals/ShikiEditor.vue`, `Editor.vue`) uses a transparent textarea on top of
   Shiki output for the markdown language, not Monaco, so slide.ng does the same. The highlighter (`dev/editor-highlight.ts`: Shiki core, the JavaScript regex engine, markdown, vitesse light and dark)
   is imported only when the editor opens, and only in the dev build (`load-highlighter.prod.ts` replaces the loader in production), so a built or exported deck carries none of it.
   The textarea and the coloured copy share every font and wrapping rule (`styles/editor.css`). The dev server's path confinement is unchanged. Tests: `editor-highlight.spec.ts`, and `tests/e2e/dev-server.mjs`
   (no highlighter before the editor opens, extra files after, more than one colour, a transparent textarea, equal metrics, typed text is coloured).
7. **Initial bundle budget: 1.5 MB warning, 3 MB error** (was 1 MB / 2 MB). Slidev has no size budget, so this is only a guard. Measured first load (raw, before compression) of the test decks:
   default deck 453 kB, showcase 473 kB, phase 3 deck 448 kB, phase 4 deck 857 kB, phase 2 deck (Monaco, KaTeX, Mermaid) 945 kB, which sat 5% under the old warning. The new warning is about 1.5 times the largest
   deck we build, so a deck that adds setup hooks, an addon or more features does not warn, while a real jump (a second large library in the first load) still does. The side editor's highlighter adds nothing (it is lazy and dev only).
8. **Setup hooks follow Slidev's `setup/` folder (docs/SETUP.md).** Read: `docs/custom/config-*.md`, `packages/slidev/node/setups/*.ts`, `packages/client/setup/*.ts`. A `setup/` folder in the deck, a theme or an addon;
   one file per hook, each default-exporting a function that gets the kind of arguments Slidev passes where that means something here; roots run weakest first and the deck last. Node hooks (`shiki`, `katex`,
   `transformers`, `preparser`) run while generating and are bundled with esbuild (`lib/setup/load-module.mjs`), because Node cannot read TypeScript inside `node_modules` and a theme there must keep its own imports;
   esbuild and magic-string are now direct dependencies (they were already in the tree). Browser hooks (`main`, `root`, `shortcuts`, `context-menu`, `mermaid`, `monaco`, `code-runners`) are written into
   `generated/setup.ts` as providers (`src/app/setup/`), so a deck without them pays nothing. How roots combine: options merge with the later root winning (shiki, katex, mermaid, monaco), lists are chained
   (shortcuts, context menu) or joined (transformers: `pre` last root first, `codeblocks` first root first, as Slidev's `setups/transformers.ts`). Where it differs: shortcut and menu entry shapes are slide.ng's own
   (`run` instead of `fn`), `main` returns Angular providers, `root` runs at start without a component, and `pre`, `preCodeblock`, `postCodeblock` are one pass. `setup/providers.ts` keeps working. Tests: `node-setups.spec.ts`,
   `browser-setups.spec.ts`, `setup.spec.ts`, and `tests/e2e/phase5` (a deck with one file per hook; each check is about changed output).
9. **Cheap leftovers of PARITY.md finished the Slidev way.** `fonts` (`lib/fonts.mjs`, a port of `resolveFonts`: sans, serif, mono, local, weights, italic, fallbacks, provider google, coollabs or none; the fonts are an @import
   from the provider, as Slidev, not copied into the build; since then `fonts.selfHost` copies them, see Offline use 8); the `contextMenu`, `presenter` and `editor` headmatter switches (`true`, `false`, `dev`, `build`; `lib/switches.ts`); touch swipes with Slidev's thresholds
   (`composables/useSwipeControls.ts`: 30% of the width or 75px for clicks, 40% of the height or 200px for slides, off while drawing). Left listed in PARITY.md: `selectable`, `themeConfig`,
   MDC, slide hooks, custom transition objects, `clickAnimation`, `preloadImages`; `--tunnel` stays refused.
10. **The official themes live in a separate repository, as npm packages `@slide-ng/theme-<name>`.** Owner decision, like Slidev's `slidevjs/themes` (a monorepo of `packages/theme-*`, each published as
    `@slidev/theme-<name>`). It supersedes the first version of this decision, which put the themes in a `themes/` folder of this package and searched it before `node_modules`. That folder is gone,
    and `themes` is no longer in `package.json#files`. `theme: <name>` now resolves from `node_modules` only, with Slidev's rule and slide.ng's prefixes: `@slide-ng/theme-<name>`, `slide-ng-theme-<name>`, `<name>`
    (addons: `@slide-ng/addon-<name>`, ...); a scoped name is used as written, a path stays a path. `scripts/lib/roots.mjs` has `candidateNames` and `packageToInstall`. The official names `seriph`, `shibainu`,
    `bricks` and `apple-basic` are not built in: when they are missing the error says `npm install -D @slide-ng/theme-seriph` (any other missing name says `slide-ng-theme-<name>`; Slidev's `officials` table does the same job).
    The themes repository (`slide-ng/themes`, npm workspaces) holds the four packages, their READMEs and showcase decks, and its own tests: a package check and a browser test that builds every deck with this
    package's command line (`SLIDE_NG_DIR` points at the checkout). This package keeps `examples/theme-minimal` and a build test that copies it into a deck's `node_modules/@slide-ng/theme-demo`
    and uses `theme: demo`, which proves the lookup end to end. Tests: `roots.spec.ts` (name rules), `install-root.spec.ts`, `tests/export/theme.mjs`; the theme tests are in the themes repository.
    Why: a theme release does not need a release of the core, the core stays small, and a theme author sees the same shape as an outside author.
    - **`default` is not a folder.** The built-in look (`src/app/layouts`, `src/styles/layouts.css`) already is the port of `@slidev/theme-default` (same six layouts, same sizes); `theme: default` and `none` add no root.
      Slidev's default theme also sets web fonts (Avenir Next, Nunito Sans, Fira Code). They are not loaded for `default` on purpose: every existing deck would start asking a network for fonts, and the offline
      tests and builds would depend on it. A deck that wants them writes `fonts:` itself.
    - **Fonts come from `theme.json`.** The `fonts` object of a theme's headmatter is the same `fonts` option as Slidev's (docs/PARITY.md), loaded as an @import from the provider. A theme's `headmatter.fonts` is merged with the
      deck's `fonts` key by key (Slidev's `resolveConfig` does the same for `fonts`, `drawings`, `htmlAttrs` and `themeConfig`; `mergeHeadmatter` now does this too). Slidev's `colorSchema` of a theme package is `colorSchema` in `theme.json`.
    - **The production build no longer inlines web fonts** (`angular.json`: `optimization.fonts.inline: false`). Angular's default downloads the font style sheet while building and fails the whole build when it cannot (offline, a proxy,
      a 403). With a theme that names web fonts that would make every build need the network. The style sheet is now an @import in the page that the browser loads when it shows the deck, as in Slidev.
    - **Assets are never copied.** The images of the originals (vector illustrations in shibainu and bricks, a random cover photo in seriph) are CC BY-NC-SA 4.0 non-commercial; slide.ng is MIT. Where an original draws a picture
      the port draws CSS gradients in the same palette (`.shibainu-bg-*`, `.bricks-bg-*`, `.seriph-cover-plain`), and each theme's README says so. The SVG paths of bricks' eleven `Polygon` components are MIT code in the original and are ported.
    - **Naming:** a layout the original names (`default-2`, `3-images`) keeps its name; the Angular selector is new (`shibainu-default-2`, `apple-three-images`). The bricks shapes are `<polygon-1 />` to `<polygon-11 />` (kebab case: an Angular
      selector cannot be matched case-insensitively from markdown), sized with classes instead of the original's `w="20"` attributes.
    - **Simplified:** `themeConfig` (not in slide.ng yet), Prism style sheets (code colours come from Shiki), the original's random cover photo, and the exact shapes of the background illustrations.

## Offline use (the owner said it matters: talks with no internet)

Verified by running the built decks in Chromium; the tests are `tests/export/offline.mjs` and `offline-net.mjs`.

1. **`slide-ng build --offline` makes a folder for `file://`.** First finding: a normal build opened from disk is a blank page, for two reasons. Chromium refuses `<script type="module">` and `import()` over `file://` (the page's
   origin is "null", the request counts as cross-origin), and addresses starting with `/` point at the root of the disk. We looked at three ways out: inlining everything into `index.html` (one huge file, slow to edit and open), a loader
   that fetches chunks (needs a request, which `file://` also refuses), and bundling to a classic script. The last one is 60 lines with esbuild (already a dependency): the built entry script and all its lazy chunks become one `iife`
   (`scripts/build/offline.mjs`), the page loads it with `defer`. Cost: lazy loading is gone, so a deck with Monaco and Mermaid is one big script (27 MB folder, 2.5 s to open on the test machine); a plain deck is not affected (about 450 kB).
2. **No `<base>` in the offline page, hash routing forced.** With `<base href="./">`, Angular's `replaceState('#/1')` resolves to the folder, not to `index.html`, and Chromium throws a SecurityError. Without a base, every relative address is
   relative to the page itself. `--base` is refused with `--offline`; `pwa` is switched off (no service worker on `file://`); `remoteAssets` and `fonts.selfHost` are on unless the deck says `false`.
3. **Workers from blobs.** `new Worker('file:///...')` is refused from a page opened from disk, which is what Monaco does. The offline build bundles each worker file as a classic script, writes the sources into `workers.js` as text, and a small
   wrapper around `window.Worker` (only on `file://`) starts them from `Blob` URLs (`scripts/build/offline-workers.mjs`). Tested: the editor is styled, has syntax colours and no console warning (without the fix Monaco warned that it fell back to the main thread).
4. **A viewer opened from a folder may drive the presenter.** The sync code only let `localhost` viewers send, so from `file://` (host name empty) only the presenter drove. A folder is on this machine by definition, so `file:` counts as local (`isLocalPage`).
   BroadcastChannel works between `file://` pages in Chromium; this was measured, not assumed.
5. **Two offline decks in one browser must not mix.** All `file://` pages share one `localStorage` and every BroadcastChannel name, so drawings and the slide position of one deck showed up in another. Drawings and the sync channel now carry the
   folder's path (`lib/disk-scope.ts`); web addresses keep the old names. Dark mode and presenter preferences stay shared on purpose.
6. **`/public` addresses in slides were never base-aware.** `![](/photo.png)` stayed `/photo.png`, so it broke under `--base /talk/` as well, not only from disk. A build now writes `/talk/photo.png` (`<img src>`, `<video src poster>`, inline `url()`,
   slide `<style>`), the offline build writes `photo.png`. The `<style>` case is left alone for `./` because the Angular build would try to bundle a relative `url()` of a component's style. The dev server is unchanged.
7. **The PDF button opens a new tab from `file://`** (the `download` attribute is ignored there, and the same tab would show the PDF in place of the deck). It is enabled without asking the server (a `HEAD` request cannot be made from disk).
8. **Fonts: `fonts.selfHost`.** Slidev loads web fonts with an `@import` from the provider and never copies them; slide.ng did the same, so the fonts failed offline. Now the build can fetch the provider's style sheet, download each font file, and
   serve them from `media/` (`lib/font-bundle.mjs`). Default on with `pwa: true` and `--offline`; `selfHost: false` turns it off; a failed download warns and keeps the `@import`. The request pretends to be a current Chrome, because Google answers
   TrueType files to unknown clients. `fonts.local` already means "installed on the system" in Slidev, so the new switch has another name. `provider` also takes the address of a css2 endpoint (needed to test against a fake provider, and useful
   for a mirror). Tested against a local fake provider; real Google Fonts were not contacted.
9. **The service worker's first-visit limit is stated, not hidden.** A browser that never opened the deck has nothing in its store; with the network off, it cannot open the deck (tested: `net::ERR_INTERNET_DISCONNECTED`). docs/OFFLINE.md says so first and
   gives the offline folder and the PDF as the answers.

## Made while preparing the repository for open source

1. **Formatting is Prettier only, with the settings already in `.prettierrc`.** `npm run format` writes, `npm run format:check` is what CI runs. The files `.prettierignore` skips are build output, the generated slides, the lock file, and decks and markdown fixtures that tests feed to the generator (reformatting a deck could change what it means). Two specs that read source text were made independent of formatting (the layout padding check) or given room on a slow machine (the first twoslash run). The dev server suite also waits a second before clearing a drawing, because the clear sometimes raced the save that came before it.
2. **Linting is ESLint 10 with a flat config** (`eslint.config.mjs`). `src` gets `typescript-eslint` and `angular-eslint` recommended rules, `.mjs` files and tests get ESLint's recommended rules only. No type-aware rules, which keeps `npm run lint` fast and the config short.
3. **New development dependencies, each with a reason:**
   - `eslint`: the linter.
   - `@eslint/js`: ESLint's recommended rule set, which the flat config imports.
   - `typescript-eslint`: lets ESLint read and check TypeScript.
   - `angular-eslint`: Angular rules for components and templates (it brings its own plugins).
   - `globals`: the lists of Node and browser global names, so `console` or `document` are not reported as undefined.
   - Nothing was added for hooks (no husky, no lint-staged): `.githooks/` and `scripts/prepare.mjs` use git's own `core.hooksPath`.
4. **Lint rules turned off or narrowed, and why:**
   - `@angular-eslint/no-input-rename` is off in `src`: directives such as `slide-ng-click`, `slide-ng-drag` and `slide-ng-mark` need a dashed attribute that differs from the input name.
   - `no-control-regex` is disabled on one line in `scripts/export/filename.mjs`: the pattern removes control characters from file names on purpose.
   - `@typescript-eslint/no-explicit-any` is off in `*.spec.ts` only (loose test doubles). It stays on in `src`.
   - Names that start with an underscore are allowed to be unused (rest destructuring that drops keys).
   - Everything else the first run reported was fixed in the code: unused imports and variables, errors thrown without `cause`, expressions used as statements, one lifecycle interface, and one unused argument pair in a test helper (`pixel` ignored its `x` and `y`).
5. **Git hooks are plain shell scripts in `.githooks/`.** `npm install` runs `scripts/prepare.mjs`, which sets `core.hooksPath` and `commit.template` only when they are unset, and does nothing without git or without a `.git` folder (a zip). The `commit-msg` hook only warns, so a hook can never block work. The pull request title check in CI does fail, because the title becomes the squash commit.
6. **Commit style: `type(scope): summary`, imperative, no trailer lines**, checked by `scripts/commit-message.mjs`. Existing history before this change does not follow it and is not rewritten for that.
7. **CI is written but has not run on GitHub.** Each command was run locally. The browser job installs Chromium with `npx playwright-core install --with-deps chromium` and passes its path as `CHROME_PATH`, which is what the test scripts read.
8. **The package stays `private: true`.** `repository`, `bugs` and `homepage` point to `https://github.com/slide-ng/slide.ng`. **The owner must confirm that organization and name** (CONTRIBUTING.md, SECURITY.md, the issue template configuration and CHANGELOG use the same address). `engines.node` is `>=22.22.3`, which the Angular CLI needs, and `.nvmrc` pins 22.23.3 for CI. `files` lists what a later publish would include.
9. **`scripts/resign-history.sh` is written but not run on this repository**, because no signing key was available. Only its refusal path was tested, in a temporary repository. See `docs/SIGNING.md`.
10. **The default branch is `main`.** The workflows and `commit-message.mjs` assume it.

## Made while fixing the security review

Source: an independent review of the repository (nine findings). Each fix has a regression test.

1. **`--remote` has no passwordless mode. This overrides decision 3 of the phase 4 list ("`--remote` works like Slidev's: the password is optional").** Reason: with no password any host on the network got the session token and could write slides.md; a slide can list `{monaco-write}` files, and a saved setup file is loaded as code by the next generator run, so a passwordless remote server was remote code execution for the whole LAN, while its warning only said "follow or move the presenter". Now `--remote=secret`, else `SLIDE_NG_PASSWORD`, else a prompt on a terminal, else a random password (24 characters from 18 random bytes) printed with the presenter address; the companion server refuses to start in remote mode without a password. Slidev parity for this flag is gone on purpose (PARITY.md). The warning now lists what the password allows.
   `{monaco-write}` targets are restricted too (`scripts/lib/monaco-targets.mjs`): an extension list, inside the deck's folder, never `setup/`, `layouts/`, `components/`, `layers/`, `styles/`, `public/`, `theme/`, `addons/`, `node_modules/`, `.git/`, package, lock or config files, hidden files or `.slide-ng/`. The same check runs when the generator lists a file and again at every write, so rewriting the list (or a slide that adds a `{monaco-write}` line) can name only files the check allows; no signed list or extra opt-in was added, because the second check on the same rule is smaller and readable.
   Tests: `dev.spec.ts`, `remote-info.spec.ts`, `monaco-targets.spec.ts`, `monaco-write.spec.ts`, `server.spec.ts`, `server-remote.spec.ts`, `tests/e2e/dev-server.mjs`.
2. **`confine` looks at the file itself** (real path of the file when it exists, a dangling link counts as existing), and write targets must not be symlinks at all (`lstat`, then `O_NOFOLLOW` in `safeWrite`). Slide files, `{monaco-write}` files and the MCP edits go through it.
3. **Reads are confined to the deck too: `<<<` snippets, `src:` imports and the MCP `get_slide` read** (`scripts/lib/outside-root.mjs`). The real path of the file must be inside the deck's folder or a theme or addon folder; otherwise the build stops with an `OutsideRootError` that names the opt-in `allowOutsideRoot: true`. The opt-in is read from the deck's own headmatter (not from the merged one), so a theme cannot switch it on. Checked in the parser: `@slidev/parser` turns a leading `/` in `src:` into a path under the deck's folder (so an absolute path cannot name a system file), but `../` and symlinks escaped, and its own `allowedRoots` option only compares text and only warns, so slide.ng checks the real paths of every loaded file after the load. A missing snippet file is still a warning, an outside one is an error.
4. **Downloads are guarded** (`scripts/lib/safe-fetch.mjs`). Remote pictures and web fonts go through one function: only http and https, no loopback, link-local (cloud metadata), private, shared, multicast or reserved address (IPv6 forms with an embedded IPv4 included), judged on the address the connection really uses (the lookup callback of `node:http`, so a name that changes its answer cannot slip through), redirects followed by hand up to 3 and each one checked, the body read as a stream that stops at the limit, `Content-Length` honoured first. Pictures must start like a known picture format; **SVG is dropped** (not sanitised: a downloaded `.svg` is served from the deck's own address and a sanitiser for general SVG is a large piece of code that would need its own review; the drawing filter of decision 6 is a shape allowlist and too narrow for logos). Fonts: only the `@font-face` rules of the provider's sheet are kept, and files must start like a font. `fonts.provider` takes a known provider or, with `fonts.allowCustomProvider: true`, another address (a mirror, a test server); the address is rebuilt by the URL parser and escaped in `@import url("...")`. The repository's own tests use local HTTP servers as the "remote" and say so with `SLIDE_NG_ALLOW_LOCAL_FETCH=1` and `allowCustomProvider: true`. Tests: `safe-fetch.spec.ts`, `remote-assets.spec.ts`, `font-bundle.spec.ts`, `fonts.spec.ts`, `tests/export/build.mjs`, `offline.mjs`, `offline-net.mjs`.
5. **The exporter keeps Chromium's sandbox and filters requests.** Playwright adds `--no-sandbox` unless `chromiumSandbox: true` is passed, so dropping the switch from the argument list alone would have changed nothing; the launch now passes the setting. `--no-sandbox` (and `SLIDE_NG_NO_SANDBOX=1` for containers and the tests, which run as root) opt out; the headmatter cannot. As root, Chromium refuses to start and the error names the flag. A request filter on the browser context (`scripts/export/request-filter.mjs`) aborts requests to loopback, private, link-local, `.local`/`.internal` names and names that resolve to such an address, and to `file:` and `ftp:`, except the exporter's own origin; `--allow-local` switches it off. The filter judges the name before the browser resolves it again, so a DNS answer that changes in between can slip through; it narrows the exposure and does not make exporting an untrusted deck safe. Tests: `request-filter.spec.ts`, `options.spec.ts`, `tests/export/sandbox-filter.mjs` (a real Chromium and two local servers).
6. **The drawing filter on the server is a parser, not a pattern** (`scripts/lib/drawing-markup.mjs`). The old regex wanted white space before `on...`, so `<path/onclick=... d="M0 0"/>` and `<path d="M0 0"onmouseover=.../>` passed. The new code reads the markup element by element and refuses the whole drawing at the first thing outside a fixed list of shapes and attributes (the ones drauu writes, plus the usual presentation attributes); the file is written from what was read, with the values escaped. It is a small strict reader instead of an XML library, because no XML parser is a runtime dependency and the accepted language is tiny; the browser still re-cleans with the DOM (`clean-svg.ts`). Tests: `drawing-markup.spec.ts`, `server.spec.ts`.
7. **A symlinked `.slide-ng` is refused, and recursive removes check the real path** (`scripts/lib/tool-dir.mjs`). `dev`, `build`, `export`, the app copy (`prepareApp`), the generator's list of editable files and the drawing writer all call `checkToolDir` first; the working copy folder must not be a link either. Every recursive removal of a tool folder goes through `removeInside`, which requires the real path to be inside the deck's (or the working copy's) real folder, and only unlinks a symbolic link without touching its target. Files copied into the working copy are removed first, so a link in their place is replaced, never written through. `claimDirectory` for `--out` keeps its older rule (the leaf may not be a link; the marker file protects a non-empty folder), because an output folder is chosen by the person and may sit behind links on purpose. Tests: `tool-dir.spec.ts`, `server.spec.ts`.
8. **The password is guarded, not only compared** (`scripts/dev/login-guard.mjs`). Per client address (the last `X-Forwarded-For` entry, which the Angular dev server's proxy adds with `xfwd: true`; earlier entries are the client's own words and are ignored): the first four wrong passwords cost the usual 400 ms, from the fifth the address is locked for 10 s, doubling with each further failure up to 15 minutes, answered with 429 and `Retry-After`, and while locked the password is not compared at all, so parallel guesses gain nothing. A login cookie is no longer one static secret for the whole run: each login gets its own random value that the server remembers with an expiry of 8 hours (`Max-Age` the same), enough for a long talk, short enough that a copied cookie stops working. The password can come from `SLIDE_NG_PASSWORD` or a prompt on a terminal (typed text is not echoed); a password given as `--remote=secret` still works and prints a note that it shows in the process list. The printed `?password=` address is still in server and proxy logs and the shell's output; that stays. There is a limit per address only: someone who controls many addresses on the network can still guess slowly, which is why the generated password has 144 bits. Tests: `login-guard.spec.ts`, `auth.spec.ts`, `server.spec.ts`, `tests/e2e/dev-server.mjs` (through the real proxy).
9. **The service worker's cache name hashes file contents**, not file lengths (`scripts/build/pwa.mjs`): a one-character fix keeps the length and used to keep the name, so visitors would have kept the old copy. Test: `pwa.spec.ts`.
   **CI has a separate `audit` job** (`npm audit --audit-level=moderate`, `continue-on-error`), so a new advisory is visible without blocking unrelated changes; it needs the network, so it is not part of `npm test`. Nothing was fixed from its output here, because this review had no network: the dependency versions were not checked against advisories.
   **`pdf-lib` (1.17.1) is not maintained any more** (no release for years). It makes the PDF outline and joins the pages in `slide-ng export`. It only reads PDFs that Chromium wrote in the same run, so the exposure is small, but it was replaced on 2026-10-16 by `@cantoo/pdf-lib` (MIT, a maintained fork with the same API; two imports changed, export tests unchanged).

10. **Edits through the server or the MCP tools cannot switch on the opt-ins** (`scripts/dev/escalation.mjs`). Without this a password holder could write `allowOutsideRoot: true` into the headmatter and then `<<< ~/.ssh/id_rsa` into a slide, which undoes decision 3 for `--remote`. The check parses the deck as it would be after the edit (so another spelling of the key does not slip by) and refuses with 422 when `allowOutsideRoot` or `fonts.allowCustomProvider` is newly on; text that does not parse yet (half-typed frontmatter) can still be saved unless it mentions the two names. Tests: `server.spec.ts`.

## Built-in names get the `slide-ng-` prefix

1. **Every built-in element and attribute that an author writes in markdown starts with `slide-ng-`** (library prefix, kebab case, the Angular way). The Vue-style `v-click`, `v-drag` and the rest are gone, and so are the short names (`<arrow>`, `<youtube>`, `<slide-toc>`): a name without the prefix could collide with HTML or with a component of the deck or a theme, and `v-` made decks look like Vue. The full table and the rule are in `RENAMES.md`.
2. **Clean break, no aliases.** Nothing was published, so there is no shim and no deprecation period. The generator refuses a slide that still uses an old name and says what to write instead (`scripts/lib/renamed.mjs`, tested in `renamed.spec.ts`). That is an error message, not an alias: the old name never works. The check skips an old name that the deck's own components declare as a selector, and it does not look into code samples.
3. **What did not change:** layout names and the `sn-*` tags they use, headmatter and frontmatter keys, CSS classes (`slidev-*`), `$clicks`-style variables, the `::code-group` markdown block, the `drag-site` and `mark-mods` attributes that the generator writes for the runtime, and the internal `app-*` components. `<slide-ng-total>` replaces `<slides-total>`, and `slide-ng-magic-move` replaces `shiki-magic-move`, because the prefix goes in front of the name without a repeated word.
4. **Hyphenated attribute selectors such as `[slide-ng-click]` are legal in Angular** and compile under AOT (checked with `ng build`). The class names follow the files: `SlideNgClick`, `SlideNgMark`, `SlideNgDrag` and so on.

## Made while testing for 1.0.0 (thirty real decks)

1. **`@angular/forms` is a dependency.** Slide components that use `ReactiveFormsModule` or `FormsModule` did not build, and installing
   the package in the deck loaded a second copy of `@angular/core` (a blank page). It is part of Angular, at the same version as `@angular/core`,
   and only the decks that import it pay for it. `@angular/animations` is not added: it is deprecated, and Angular's own `animate.enter` /
   `animate.leave` work in slides.
2. **Pipes in a deck's `components/` are imported like components**, by the pipe's `name` used in a slide's expressions (`{{ x | initials }}`),
   and Angular's common pipes are imported when a slide uses them.
3. **A slide's frontmatter with broken YAML stops the build** with the file, line and slide, like a broken headmatter; it used to lose keys silently.
4. **`download: true` in the headmatter makes the PDF when it can**: without a working Chromium the build warns and the button stays disabled.
   `--download` keeps failing, because it asks for the PDF explicitly.
5. **Build budgets are guards, not limits: 6 MB warning, 100 MB error for the first load; 64 kB / 1 MB for a component's styles.** Every
   slide is in the first bundle and highlighted code compiles to a lot of markup, so a 70-slide workshop with a code block per slide is
   over 3 MB and failed to build. A deck is opened once and kept; the warning still says when a deck is large.
6. **`ngNonBindable` or `\{\{` for a literal `{{`.** Angular decodes `&#123;&#123;` back to `{{` and reads an interpolation, so the generator
   writes the first brace of an escaped pair as `{{ '{' }}`.
7. **Angular's common and forms directives are imported by the slides that use them**, as the pipes are; the rest of `@angular/common`
   and `@angular/forms` stays out of the bundle.
8. **`<slide-ng-drag-arrow pos>` is `x,y,width,height`, as Slidev's `v-drag-arrow`** (from (x, y) to (x + width, y + height), sizes may be
   negative). It was `x1,y1,x2,y2`, which drew a ported Slidev arrow somewhere else.
9. **`dev`, `build` and `export` each have their own working copy** (`.slide-ng/app`, `app-build`, `app-export`). They shared one, so a
   build while the dev server ran replaced the files under it and stopped it. The price is a slower first build for each command (each has
   its own Angular cache).
10. **Of two shortcuts with the same key, the later one wins.** The list is built theme, addons, deck, so appending
    `{ key: 'k' }` replaces an earlier root's `k` or a built-in key. Slidev runs every match; one action per key is easier to predict. For the
    same reason a deck's `CODE_RUNNERS` provider comes after every root's `setup/code-runners.ts`.
11. **A theme made for one mode keeps it.** `colorSchema: light` or `dark` in a `theme.json` means the theme has no colours for the other
    mode, so a deck's `auto` (or the other mode) would show unstyled slides; the deck keeps the theme's mode and the generator says so.
    This matches Slidev's `colorSchema` in a theme's package.
12. **`--remote` logins are signed with the password** (`id.expiry.HMAC`) instead of being kept in the server's memory, so restarting the
    dev server mid-talk does not ask every device for the password again. A login still runs out after 8 hours; changing the password ends
    every login at once, and that is the only way to end one early (as before, there is no log-out).
13. **Web components are allowed per tag (`customElements: [...]`), per slide.** `CUSTOM_ELEMENTS_SCHEMA` on every slide would hide
    every mistyped component name; only the slides that use a listed tag get it.
14. **Swipes use touch events**, with `touch-action: pan-y pinch-zoom` on the stage: a sideways swipe is the deck's, pinch zoom stays the
    browser's, and an up or down swipe still counts after the browser has taken it as panning (which cancels pointer events).
15. **`<slide-ng-clicks>` gives a click to each child, as Slidev's `v-clicks` does**: each item of a single list, each body row of a
    single table, otherwise each child element. It used to count list items only, so a ported `v-clicks` over paragraphs showed everything.
16. **A relative picture next to `slides.md` is copied into the build** (`/_local/...`) when `public/` does not have it. Slidev decks
    write `./images/x.png` because Vite bundles it; failing silently with a 404 made those decks look broken. Files outside the deck's
    folder are never copied.
