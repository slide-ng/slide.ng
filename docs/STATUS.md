# Status: phase 4 (export, tooling, ecosystem)

Phases 0 to 3 are unchanged and still pass. Phase 4 added the print route, export, the static build, head and SEO tags, the offline mode, the
command line as a package, themes and addons, an example theme, the MCP server and the parity table.

## Done (each item was run; results below)

1. **Print route** `/print` and `/presenter/print`: ids `<slide>-<click>`, `?print=clicks`, `?range=`, `data-slide-ng-waitfor` markers on every lazy component.
2. **Export** `slide-ng export`: PDF (one page per slide or click step, outline with `--with-toc`, title), PNG, Markdown with pictures and notes, PPTX of pictures with notes,
   `export-notes`; flags `--format --output --range --with-clicks --dark --timeout --wait --wait-until --executable-path --per-slide --scale --omit-background --with-toc`, `--dist`, `--url`;
   headmatter `exportFilename`, `export`, `download`. File names are sanitised and nothing is written outside the output place.
3. **Static build** `slide-ng build`: `--base`, `--out`, `--download`, `--without-notes`, `--theme`, several entries (`<out>/<name>/`, also for `export` and `export-notes`, one file each); `404.html`, `_redirects`, hash or history routing, `remoteAssets`, size budgets, docs/HOSTING.md.
4. **Head and SEO**: `title`, `titleTemplate`, `info`, `author`, `keywords`, `favicon`, `lang`, `htmlAttrs`, `seoMeta`, Open Graph picture (`auto` makes a screenshot of slide 1), and the `index.html` of the deck, theme and addons (its head and body merged into the page, as in Slidev).
5. **Offline mode** (`pwa: true`): manifest, install icons (192, 512, maskable 512), service worker and an "Available offline" / "Offline" label, tested in Chromium with the server stopped.
6. **Command line as a package**: `bin/slide-ng.mjs` with `dev` (default, with the terminal keys `r o e q c` and a QR code for `--remote`), `build`, `export`, `export-notes`, `format`, `theme eject`, `mcp`, `create`; flags `--port --open --remote --bind --log --force --base (build) --theme`;
   `npm start` runs the same code. Single package with a `template/` folder (DECISIONS.md 11). `create my-deck` was run, and the new deck was formatted and built (the repository stands in for `npm install slide-ng`, see below).
7. **Themes and addons**: `theme:`, `addons:`, `--theme`, folders in the deck, layouts, components, layers, styles, public, UnoCSS settings, default headmatter, the `setup/` hooks (docs/SETUP.md), `theme eject`,
   `examples/theme-minimal` (docs/THEMES.md, docs/WRITING-A-THEME.md). The example theme changes the rendered output and its component is used from slides (browser test).
8. **MCP server** `slide-ng mcp`: seven tools, tested with a scripted client over stdio (initialize, tools/list, get, update, insert, move, remove, refusals, path confinement). The dev server serves them over streamable HTTP at `/__mcp` with `get_info` and `goto_slide` (`mcp: false` turns it off), tested with the SDK's HTTP client in a unit test and through the proxy in `test:dev`.
9. **Polish**: the PDF button in the bar (enabled only when the PDF exists), `dev --open`, `--theme`, the side editor takes over outside edits, the next-step preview draws global layers, slide-ng-drag boxes were already drawn in thumbnails.
10. **Official themes**: `seriph`, `shibainu`, `bricks` and `apple-basic` are npm packages `@slide-ng/theme-<name>` in the separate slide-ng/themes repository (DECISIONS.md 10), with the layouts, components, fonts,
    READMEs, showcase decks, NOTICE and tests. This package resolves `theme: <name>` from `node_modules` like Slidev (`@slide-ng/theme-<name>`, `slide-ng-theme-<name>`, `<name>`); `default` is the built-in look.
    A missing official theme stops the build with `npm install -D @slide-ng/theme-<name>`. A fake `@slide-ng/theme-demo` package (a copy of `examples/theme-minimal`) is built end to end in `tests/export/theme.mjs`.
11. **docs/PARITY.md**: 173 rows, a test found for each `done` row, and a ranked list of gaps.
12. **Offline use** (docs/OFFLINE.md): `slide-ng build --offline` makes a folder that opens from disk in Chromium (classic script, hash routing, relative addresses, Monaco workers from blobs, no service worker);
    window sync between `file://` pages; web fonts and remote pictures bundled (`fonts.selfHost`, on for `pwa` and `--offline`); `/public` addresses get the deck's base; the first-visit limit of the PWA is stated; a checklist for presenters.
13. **Agent skill** (`skills/slide-ng`, docs/AGENT-SKILL.md): `SKILL.md` and 83 short references grouped by prefix, one for each feature marked done in PARITY.md, with the Angular-not-Vue differences and a `not-supported.md`. `slide-ng skills install [--dir] [--force]` copies it into a project. `npm run test:skills` builds every `<!-- verify -->` sample (73) with the real generator and one combined `slide-ng build`; `npm run check:skills` is a drift guard over the hashes in `skills/GENERATION.md` (CI runs both). Writing the samples found two documentation mistakes (a Monaco setup example that no longer type-checks, an example in SYNTAX.md that Prettier had broken) and two wrong claims (PARITY said 22 layouts and `<carbon:...>` tags).

## Test results (last run, Node 22.23.3, Chromium from `/opt/pw-browsers`)

- `npm run build`: succeeds.
- `npm test`: 120 files, **914** tests passed (theme and addon names: `roots.spec.ts`; the agent skill: `skills.spec.ts`, `hash.spec.ts`, `samples.spec.ts`).
- `npm run test:e2e`: starter deck **45**, showcase **144**, code and content **128**, phase 3 decks **185**, print route **24**, setup hooks **24**, 0 failed. The official theme tests (every layout of four themes, fonts, PNG export) moved to the slide-ng/themes repository.
- `npm run test:dev`: live update **6**, dev server **52**; 0 failed.
- `npm run test:export`: export command **34**, sandbox filter **4**, build **47**, theme **22**, example themes (paper, moss, blueprint) **28**, scaffold **13**, MCP **23**, offline folder from disk **40**, network off **13**, agent skill samples **74** (generated one by one, then built together); 0 failed.

## Testing for 1.0.0 (fifty decks and a real port)

Fifty decks written for the purpose (different subjects, themes, Angular features and Slidev features) and a port of a real Slidev talk
were built, exported and presented, in two rounds of thirty and twenty; turning thirty-one of them into a showcase found a few more.
Round one found about ninety problems and round two about ninety more; all are fixed except the ones below, each with a test where
one can be written. The decisions are in DECISIONS.md ("Made while testing for 1.0.0"), the list in CHANGELOG.md.

- `:emoji:` shortcodes are not converted (it would need a new dependency); the docs and the skill say to type the emoji.
- Behind some test servers the PDF button's `HEAD` probe is reported as a failed request; real hosts answer it, nothing to fix in slide.ng.
- A paragraph right after a heading is dimmed (`h1 + p`, as in Slidev), also when it holds only a component; a theme can undo it.
- A dark-only theme forced into light with `colorSchema` keeps its dark panels with light code colours.
- In `dev`, a device that joins later sees drawings saved earlier only after the next regeneration.
- Keyboard and screen reader use of the menus is not complete: Escape does not always give focus back, the overview moves a highlight
  instead of the focus, and the context menu has no arrow-key support.

## Not done

- **Editable PPTX** (out of scope on purpose). PPTX holds pictures and notes only.
- No `--format pptx-editable`.
- `dev --tunnel` (needs a tunnel service; refused with a message) and `dev --base` (refused with a message).
- Prettier plugin, Vue-syntax converter, community themes, browser exporter page, `overviewSnapshots` (out of scope). A VS Code extension exists in the slide-ng/vscode-extension repository (first version, not released, never run inside VS Code).
- Monaco type loading; MDC/Comark; touch tuning for drawing and drag. The full list is in docs/PARITY.md.
- `preloadImages` loads pictures from the app; unlike Slidev, the built page has no `<link rel=preload>` for every picture (they would compete with the app's own first load).
- Offline: PlantUML, `<slide-ng-youtube>`, `<slide-ng-tweet>` and `<slide-ng-blue-sky>` need the network, also in an offline folder. A deck with Monaco and Mermaid becomes one large script in an offline folder (27 MB folder, 16 MB script for the phase 2 test deck).
- PWA: the first visit must be online (a browser that never opened the deck cannot get it offline). Remote pictures are not cached in dev. Icons are drawn with Chromium at build time (a build without one warns and has no icons).
- Links: in speaker notes a link to a slide stays a plain address, so a click in the presenter view loads that address. In a PDF made with `--per-slide`, or with `--range` that leaves the slide out, a link to another slide is no link.
- MCP: slide 1 cannot be removed or moved; insert, remove and move need all slides in the entry file.
- The first load of a deck with Monaco and KaTeX is about 850 kB (budget 1.5 MB / 3 MB).
- Security fixes (docs/SECURITY-MODEL.md, decisions "Made while fixing the security review"): tested with unit tests and local servers only. NOT VERIFIED: a real LAN with a second device; the request filter of the exporter against a DNS name whose answer changes after the check; real Google Fonts with the new provider rules; `npm audit` output (no network when this was written); the password prompt on a real terminal.
- Recording: no separate camera file, no mp4 or mkv, no cloud upload. No HTTPS for `--remote` (as before).
- Phase 2 and phase 3 lists still apply (Monaco and Mermaid limits, `slide-ng-motion` limits, footnote limits, resizing a rotated `slide-ng-drag` box, `{monaco-write}` limits, imported slides outside the deck's folder cannot be edited by the dev server).
- Interface language (docs/UI-STRINGS.md): Turkish is the only built-in translation. Error messages that come from the browser (camera, recording,
  screen sharing) and generator warnings stay English. In a right-to-left deck the bar, menus and presenter are mirrored, but the arrow keys,
  swipes and the drawing toolbar's position are not. There is no way to switch the language while presenting; one entry file per language is
  the recipe (SYNTAX.md "One deck in several languages").
- Agent skill: the samples prove that decks generate and compile, not that they look right. In the combined build only the `theme`, `addons` and `codeAliases` of the samples' headmatter are applied; other headmatter keys are checked by the generator alone (`--each` builds every sample alone, slow, run by hand). Features that need a network, a browser or a device are described in the skill, not run. The skill is written by hand; the drift guard only notices that a document changed, not whether the skill was updated well.

## Problems found and fixed along the way

- A normal build opened from disk was a blank page (module scripts and `import()` are refused over `file://`; `/` addresses point at the disk root): `build --offline`.
- `new Worker('file://...')` is refused, so Monaco fell back to the main thread with errors: workers start from blobs in an offline folder.
- A viewer on `file://` could not drive the presenter (the local-host rule did not know `file:`); fixed with a unit test and a browser test.
- All `file://` pages share one storage and broadcast channel, so two offline decks mixed drawings and slide positions: both are per folder now.
- `/public` addresses in slides (`![](/photo.png)`) ignored `--base` (a deck under `/talk/` asked the host root): the build puts the base in front; test in `tests/export/build.mjs`.
- The PDF button on `file://` stayed disabled (a `HEAD` request cannot be made) and a click would have replaced the deck with the PDF: enabled, opens a new tab.
- Web fonts were an `@import` from the provider, so they failed offline: `fonts.selfHost`.

- `replaceSource` (side editor and MCP) dropped the blank line under a plain `---`, so a slide's text became frontmatter; fixed with a unit test.
- `safeName('a/../b')` produced `a-.-b`; now `a-b`.
- The notes PDF is 594.96 pt wide, not 595 (A4 rounding); the test accepts both.
- The "outline destination" test was vacuous; it now checks real page numbers, also with clicks.
- The scaffold's create step failed inside the unit test bundle (the file cannot tell where it lives); it now takes the package folder as a parameter.
- `theme eject` of an installed package copied nothing, because the copy filter skipped every path that contains `node_modules` and the package itself sits in one; it now tests only the part below the theme's folder (covered by the fake `@slide-ng/theme-demo` in `tests/export/theme.mjs`).
- The build test blocked its own "remote" server with a synchronous call; now asynchronous.
- A flaky "a click elsewhere closes the menu" check waited too little for the menu to open; it waits now.
- Running the unit tests and a build at the same time breaks both (they share `src/slides/generated`); tests are run one after the other.

## Not done: official themes

- The themes are on npm as `@slide-ng/theme-<name>` and live in the slide-ng/themes repository; a deck installs them like any package.
- The original background illustrations (shibainu, bricks) and the random cover photo (seriph) are not used (CC BY-NC-SA, non-commercial): CSS gradients in the same palette stand in.
- Prism style sheets are not ported; Slidev's default theme fonts are not loaded for `theme: default`.
- The themes tests stub the font style sheet, so the fonts themselves were not seen rendered (the request and the CSS font names are checked).

## NOT VERIFIED

- **A real install from the registry**: `@slide-ng/core` 1.0.0 is on npm and a new deck asks for `^1.0.0`; the scaffold test still links this repository into the new deck's `node_modules`, so it checks this checkout, not the registry copy.
- `dev --open` opening a real browser window: the flag is passed to `ng serve --open` and parsed in a unit test only. The terminal keys are tested with a fake terminal; `o` and `e` were not seen opening a real browser or editor, `r` was not tried by hand, and the QR code was not scanned with a phone.
- `CODE_RUNNERS` (a theme replacing how `{monaco-run}` runs code): written, documented, no test.
- Addons end to end: resolution and merge order are unit-tested, but no deck was built with an addon.
- `theme eject` of a package is tested with the fake `@slide-ng/theme-demo`, not with a package from a registry.
- Export and build with Firefox or WebKit: only Chromium is used. PDF text, page sizes and outlines were checked with the poppler tools and the PPTX through its file structure; none was opened in PowerPoint, Keynote or Acrobat.
- The Open Graph picture and the tags in a real crawler or chat application.
- Hosting on GitHub Pages or Netlify (the files they read are written and the local static server was used).
- The offline mode and the offline folder in browsers other than Chromium (Firefox treats each `file://` page as its own origin; window sync from a folder is probably broken there), and an update of a deck that is already cached.
- Real Google Fonts for `fonts.selfHost` (only a local fake provider was used), camera, microphone, screen share and recording from `file://`, an offline folder on a network share or a USB stick, and Chromium-based browsers other than the bundled one.
- The `dev` and `build` values of `monaco` and `twoslash` in a real `slide-ng dev` session (the switch and the plain-code output are unit-tested).
- `<slide-ng-video printTimestamp>` with a real video in an exported PDF (the seek is unit-tested, the print poster is checked in the browser); a seek that is slow to finish is not waited for, as in Slidev.
- The real screen-share picker, recording quality, the wake lock, `--remote` from a second physical device and over a real LAN, touch input (all as in phase 3).
- The progress bar's timer minutes (`progressBar: { minutes: true }`) on a viewer on another device: checked between windows of one browser only.
- The sync mode menu between devices over `--remote` (tested between windows of one browser).
- Presenter pane resizing with touch input, and Edit Notes from a second device over `--remote` (both tried with a mouse on this machine only).
- Everything under the phase 1 and 2 NOT VERIFIED lists.

## macOS run (2026-10-16, Node 24, Chrome from `/Applications`)

Run with `CHROME_PATH` set and `VSCODE_CWD` unset (the icon generator skips local icon sets when it is set). `pdfinfo` (poppler) and `qpdf` are needed for the export suite.

- `npm run lint`, `format:check`, `build`, `check:skills`: pass. `npm test`: **851** passed. `test:e2e`: pass (154, 24, 24). `test:export`: pass after the fixes below.
- `test:dev`: live update 6 pass; dev server 50 pass, 1 fails ("arrow keys nudge and are saved once the keys rest") on every run here. The code path looks correct; not yet explained.
- Fixed on the Mac: a blank last page in PDF export (Chrome), `--out` through a symbolic link such as `/var` bypassing the current-folder guard, three dev-test races (`localhost` vs `127.0.0.1`, typed text coloured, a refused huge upload reset by the server).
- `npm audit`: 6 high (`braces`, `chokidar`, `image-size` through `pptxgenjs`, `@slidev/types`, `vite-plugin-static-copy`), 0 critical. `pdf-lib` was replaced by the maintained fork `@cantoo/pdf-lib`.
- Docker image: builds and serves. PDF export in the container needs `SLIDE_NG_NO_SANDBOX=1` (owner decision). A deck bind-mounted read-write fails on Docker Desktop for Mac; mount it `:ro`.
