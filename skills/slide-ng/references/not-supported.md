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
- `selectable`, `PoweredBySlidev`.
- `<slide-ng-click>` as a tag, PascalCase tags.
- markdown-it typographer (smart quotes, `--`, `...`) and `v-pre` (use `ngNonBindable`, or `&#123;&#123;` for a literal `{{`).
- `colorSchema: all`.

**Animation**

- The transition object's `mode`, `moveClass` and JavaScript hooks.
- `slide-ng-motion` presets, springs, `hovered`, `tapped`, `focused`, `visible`, keyframe lists.

**Code**

- Monaco type loading (`monacoTypesSource`, `monacoRunAdditionalDeps`), markdown-it plugins, a run context for code runners.
- `mhchem`.

**Presenting**

- A separate camera recording file, mp4 or mkv, cloud upload. No HTTPS for `--remote`.
- Pinch zoom, touch tuning for drawing and `slide-ng-drag`.

**CLI and build**

- `dev --base`, `dev --tunnel`, `dev --inspect`. `--force` only clears the build cache.
- `--format pptx-editable` (PPTX is pictures only).
- A browser exporter page, `overviewSnapshots` (the overview draws live slides).

**Ecosystem**

- Slidev themes and addons (they are Vue), a theme or addon gallery, community themes.
- A Prettier plugin (the `format` command covers the markdown structure). The VS Code extension is in the separate slide-ng/vscode-extension repository (first version, not released, never run inside VS Code).
- `src/app/components` is not scanned; components go in `components/` next to the deck.

**Not checked** (may work, was never tried): Firefox and Safari for exports and offline folders, real devices over a LAN, a real screen-share picker, wake lock, real Google Fonts for self-hosting, GitHub Pages / Netlify hosting, addons built end to end, a deck installed from the npm registry (a new deck asks for the `@slide-ng/core` that created it, `^3.2.0`; only the packed package was tried).

When a request needs one of these, say it is not available and offer the nearest thing that exists (for example a component instead of a Vue directive).
