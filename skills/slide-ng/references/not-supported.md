---
name: not-supported
description: What slide.ng does not have - do not invent these features
---

# Not supported

If a feature is not listed as present in the other references, assume it is missing. Verified gaps (from the parity table):

**Syntax and markup**

- MDC / Comark syntax (`comark: true`, `mdc: true`): not parsed; the generator warns and the syntax stays text.
- `:emoji:` shortcodes (type the emoji itself).
- `<script setup>`, Vue directives other than the slide.ng ones, a Vue-to-Angular converter.
- `selectable`, `TitleRenderer` (slide titles are plain text; `$math$` in a title is drawn in the table of contents), `PoweredBySlidev`, `notesAutoRuby`.
- Slide hooks `onSlideEnter`, `onSlideLeave`, `useIsSlideActive`.
- `<slide-ng-click>` as a tag, `.hide` modifiers (use `slide-ng-click-hide`), PascalCase tags, `--uno` in `<style>`.
- UnoCSS attributify (`flex="~"`), variant groups (`hover:(a b)`), the typography preset (`prose`), `transformerDirectives`. Use plain classes.
- markdown-it typographer (smart quotes, `--`, `...`) and `v-pre` (use `ngNonBindable`, or `&#123;&#123;` for a literal `{{`).
- `colorSchema: all`. `routerMode: memory`, `setup/routes.ts`.

**Animation**

- Custom transition objects (Vue `TransitionGroupProps`, class names), `clickAnimation`, `preloadImages`, slide `preload`.
- `slide-ng-motion` presets, springs, `hovered`, `tapped`, `focused`, `visible`, keyframe lists.

**Code**

- Monaco type loading (`monacoTypesSource`, `monacoRunAdditionalDeps`), markdown-it plugins, a run context for code runners.
- Twoslash `dev|build` switch, `shiki.magicMove` options other than duration and copy, the `~icon~` code group titles, `mhchem`.
- `<slide-ng-youtube>` start time and playlists.

**Presenting**

- The sync mode menu (Slidev's SyncControls: send only, receive only, off). Windows and devices always follow the presenter.
- A separate camera recording file, mp4 or mkv, cloud upload. No HTTPS for `--remote`.
- Pinch zoom, touch tuning for drawing and `slide-ng-drag`.

**CLI and build**

- `dev --base`, `dev --tunnel`, `dev --inspect`, `build --router-mode`. `--force` only clears the build cache.
- `export` with several entries; `--format pptx-editable` (PPTX is pictures only).
- A browser exporter page, `overviewSnapshots` (the overview draws live slides).

**Ecosystem**

- Slidev themes and addons (they are Vue), a theme or addon gallery, community themes.
- A Prettier plugin (the `format` command covers the markdown structure). The VS Code extension is in the separate slide-ng/vscode-extension repository (first version, not released, never run inside VS Code).
- `src/app/components` is not scanned; components go in `components/` next to the deck.

**Not checked** (may work, was never tried): Firefox and Safari for exports and offline folders, real devices over a LAN, a real screen-share picker, wake lock, real Google Fonts for self-hosting, GitHub Pages / Netlify hosting, addons built end to end, a deck installed from the npm registry with this version (a new deck gets the published `@slide-ng/core` 0.1.0).

When a request needs one of these, say it is not available and offer the nearest thing that exists (for example a component instead of a slide hook).
