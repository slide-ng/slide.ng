# Themes and addons: the contract

A theme or addon is a folder (or an npm package) that adds to the built-in look. This page is the reference; the step-by-step
guide is [WRITING-A-THEME.md](WRITING-A-THEME.md). The working example is [`examples/theme-minimal`](../examples/theme-minimal).

The repository has three more example themes to copy or use as they are: [`theme-paper`](../examples/theme-paper) (light, editorial: serif
headlines, a vermilion accent), [`theme-moss`](../examples/theme-moss) (dark, forest green and clay) and [`theme-blueprint`](../examples/theme-blueprint)
(navy drafting grid, amber marks). Each README lists its layouts, inputs and component.

## Using one

```yaml
---
theme: ./my-theme # a folder next to the deck, an absolute path, or a package name
addons:
  - ./my-addon
  - slide-ng-addon-charts
---
```

- `theme: default` (or `none`, or no `theme:`) is the built-in theme.
- Any other name that is not a path is looked up in `node_modules` (from the deck's folder upwards), like Slidev does it: `@slide-ng/theme-<name>`,
  then `slide-ng-theme-<name>`, then `<name>`. A scoped name (`@scope/theme-x`) is used as written. Addons use `@slide-ng/addon-<name>`,
  `slide-ng-addon-<name>`, then `<name>`.
- The official themes `seriph`, `shibainu`, `bricks`, `apple-basic` and `adev` are not part of this package. They live in their own repository
  (slide-ng/themes, one package each): `npm i -D @slide-ng/theme-seriph`, then `theme: seriph` (see below).
- A path that is not a folder is an error, and so is a package name that is not installed, as in Slidev: the build stops with
  `The theme "x" was not found. Install it with: npm install -D slide-ng-theme-x` (for an official name the package is `@slide-ng/theme-<name>`;
  `pnpm add -D` or `yarn add -D` when the deck has that lock file).
  In a terminal, `dev` and `build` ask first whether to install it now. A name with a slash (`themes/mine`) is a path, `@/themes/mine` is relative to the deck's folder.
- `SLIDE_NG_THEME=<name|path>` in the environment overrides the headmatter (the generator reads it).
- `slide-ng theme eject` copies the theme in use into `./theme` and sets `theme: ./theme` (see below).

## The official themes

They are rebuilt from the official Slidev themes (MIT; the layouts, names, slots, CSS values and font settings are ported, the components are new Angular code)
and published from a separate repository, slide-ng/themes, the way Slidev keeps its themes in `slidevjs/themes`: a monorepo of packages
`@slide-ng/theme-<name>` that follow the contract below. Each has a README that credits the original author and lists what is ported and what is simplified,
and the repository's `examples/<name>.md` has a slide for every layout.

| `theme:`      | Package                                                                | Original                       | Layouts                                                                                         |
| ------------- | ---------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| `default`     | none: the built-in theme (`src/app/layouts`, `src/styles/layouts.css`) | `@slidev/theme-default`        | `cover`, `intro`, `fact`, `statement`, `quote`, `section`                                       |
| `seriph`      | `@slide-ng/theme-seriph`                                               | `@slidev/theme-seriph`         | `cover`                                                                                         |
| `shibainu`    | `@slide-ng/theme-shibainu`                                             | `@slidev/theme-shibainu`       | 14 (`cover`, `default`, `center`, `section`, `default-2` to `default-7`, `right`, `quote`, ...) |
| `bricks`      | `@slide-ng/theme-bricks`                                               | `@slidev/theme-bricks`         | 9; components `<polygon-1 />` to `<polygon-11 />`                                               |
| `apple-basic` | `@slide-ng/theme-apple-basic`                                          | `@slidev/theme-apple-basic`    | 10                                                                                              |
| `adev`        | `@slide-ng/theme-adev`                                                 | none (inspired by angular.dev) | 12; components `<adev-alert />`, `<adev-card-grid />` and more                                  |

`default` is a port of Slidev's default theme already; its web fonts (Avenir Next, Nunito Sans) are not loaded for it, set `fonts:` to get them.

Fonts in a theme's `theme.json` are loaded from the provider like Slidev's `fonts` option (a Google Fonts style sheet). A deck's own `fonts` are merged over them key by key,
so `fonts: { mono: 'Fira Code' }` keeps the theme's `sans`, and `fonts: { provider: none }` loads nothing.
The images and other assets of the Slidev themes are CC BY-NC-SA and are not included in the packages.

## The roots, and who wins

Each of these is a "root". Later roots win over earlier ones, file by file and name by name:

1. the built-in theme (`src/app`, always there)
2. `theme:`
3. each of `addons:`, in order
4. the deck's own folder (the folder of the entry file)

So a deck can put a `layouts/cover.ts` next to `slides.md` and it beats the theme's cover. The deck's folder is only searched for the
folders listed below; the rest of it (your markdown, `node_modules`, ...) is never copied.

## What a root can contain

| Folder or file       | What it does                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layouts/<name>.ts`  | A layout. `<name>` is what a slide writes in `layout:`. The same name replaces a built-in layout.                                                                                  |
| `components/*.ts`    | Components that slides can use as tags. Found by their `selector`.                                                                                                                 |
| `layers/<name>.ts`   | A layer component: `global-top`, `global-bottom`, `slide-top`, `slide-bottom` (default export).                                                                                    |
| `styles/index.css`   | CSS. Added after the app's styles, so it can override them.                                                                                                                        |
| `public/`            | Files served from the site root (`/logo.png`). Merged; the later root wins on the same name.                                                                                       |
| `setup/*.ts`         | Setup hooks: `shiki`, `katex`, `transformers`, `preparser`, `mermaid`, `monaco`, `code-runners`, `shortcuts`, `context-menu`, `main`, `root`. Written out in [SETUP.md](SETUP.md). |
| `setup/providers.ts` | Angular providers (default export: an array; `setup/main.ts` is the newer way). See "Setup hooks".                                                                                 |
| `uno.config.mjs`     | UnoCSS settings (default export). Merged into the app's: `presets`, `rules`, `safelist`, `variants` are added; `shortcuts` and `theme` are merged key by key.                      |
| `theme.json`         | Name, default headmatter and layout inputs. See below.                                                                                                                             |

### Layouts

A layout is a standalone Angular component with a `selector` and an exported class. The generator finds it by reading the file as text
(`@Component({ ... selector: '...' ... }) export class Name`), so keep the selector as a string literal. Slide content goes into
`<ng-content />`. A layout that replaces a built-in one **keeps the built-in layout's inputs** (for example `cover` keeps `background`):
the frontmatter keys that are inputs become attributes of your tag, so give your component inputs of the same names. To change the list,
use `theme.json`. Text, numbers and booleans arrive as text, as for any HTML attribute: use `input(0, { transform: numberAttribute })` or
`booleanAttribute` for them (`draft: false` is the text `"false"` otherwise). A list or an object (`owners: [Priya, Jonas]`) is bound as its value.

### Components

Every exported component with a selector in `components/` is available. A component is imported into a slide only when the slide's
markup contains `<selector`. Giving a component the same class name as a built-in one replaces it.

### Importing from the app

Theme code is copied into the app before it is compiled, so it cannot use `../` to reach the app. Use the path alias `slide-ng/`:

```ts
import { ClicksContext } from 'slide-ng/lib/clicks';
import { SHORTCUTS_SETUP } from 'slide-ng/lib/shortcuts';
```

`slide-ng/<path>` means `src/app/<path>`. Angular and other packages are imported as usual.

### `theme.json`

```json
{
  "name": "minimal",
  "headmatter": { "colorSchema": "dark", "transition": "fade" },
  "layouts": { "quote": { "props": ["author"], "slots": [], "classProp": false } }
}
```

- `headmatter`: defaults for the deck. The deck's own headmatter wins, except `colorSchema`: a theme that sets `light` or `dark` has
  colours for that mode only, so the deck keeps it (as in Slidev; the generator says so when the deck asks for another). `defaults:` (the frontmatter every slide starts from) and the objects `fonts`, `drawings`, `htmlAttrs`
  and `themeConfig` are merged key by key, as in Slidev.
- `layouts.<name>`: `props` are the frontmatter keys that become inputs, `slots` are the names accepted after `::name::`,
  `classProp: true` sends the slide's `class` to the input `contentClass` instead of the tag.
  A slot's content reaches the layout as an element with the slot's name as an attribute, so the layout places it with
  `<ng-content select="[name]" />` (the built-in `two-cols` uses `select="[left]"` and `select="[right]"`).
- The deck's own folder can have a `theme.json` too, to declare the inputs and slots of its own layouts.

### `themeConfig`

The settings a theme offers to decks, as in Slidev. Give the defaults in `theme.json`; the deck's `themeConfig` is merged over them
key by key (an addon's too):

```json
{ "name": "ocean", "headmatter": { "themeConfig": { "primary": "#0e7490", "accent": "#f59e0b" } } }
```

- **In CSS**: each key with a text or number value is the variable `--slidev-theme-<key>` on `<body>` (the key as written, so
  `accent` is `--slidev-theme-accent`). It is written into the generated `theme.css` after the roots' style sheets, so it wins
  over a value on `:root` or `html.dark`, also the default `--slidev-theme-primary` of the app, and it is there in the
  presenter, the PDF and offline builds. Use it in rules on the elements (`color: var(--slidev-theme-accent)`), or alias it
  on `body` or below; an alias on `:root` is resolved before the variable exists there. `primary` already colours the
  built-in accent (`text-primary`, the progress bar, the controls).
- **In code**: `inject(THEME_CONFIG)` (from `slide-ng/lib/theme-config`) is the whole merged map, also lists and objects.
  Slides read it as `themeConfig` (`{{ themeConfig['primary'] }}`; the brackets are needed because the map has no fixed keys).
- A key must be letters, digits, `-` and `_`. A value that could leave the CSS declaration (`;`, `{`, `}`, `<`, `>`, `\`, a
  comment, a line break, quotes or brackets that do not close) is skipped with a warning; it is still in `THEME_CONFIG`.
  So is a `url(...)` or `image-set(...)`: the generated CSS would look for the file in the wrong folder, without the base.
  Name pictures in the theme's `styles/` instead.
- There is one value for both colour modes, as in Slidev. A theme that wants another dark colour can offer a second key
  (`primaryDark`) and use it under `html.dark`.

## Setup hooks

The hooks of a theme or addon work the same as in a deck and are listed, with examples, in [SETUP.md](SETUP.md); the deck's own file always runs last.

`setup/providers.ts` default-exports an array of Angular providers. They are added to the application, so a theme can use any token the app injects:

| Token             | From                      | Use                                                                                                                                                                                             |
| ----------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SHORTCUTS_SETUP` | `slide-ng/lib/shortcuts`  | A function `(actions, list) => list`: add, change or remove keyboard shortcuts. One provider is used (the last root's); the `setup/shortcuts.ts` files of all roots run after it.               |
| `CODE_RUNNERS`    | `slide-ng/code/runners`   | `{ provide: CODE_RUNNERS, multi: true, useValue: { javascript: (code) => result } }`: replace how `{monaco-run}` runs a language. The key is Monaco's language id (`javascript`, `typescript`). |
| `SYNC_TRANSPORTS` | `slide-ng/sync/transport` | Another way to carry presenter sync (multi).                                                                                                                                                    |

## `slide-ng theme eject`

```sh
slide-ng theme eject [slides.md] [--dir theme]
```

Copies the theme in use into `./theme` and sets `theme: ./theme` (`--theme` or `SLIDE_NG_THEME` picks another theme). For the
built-in theme this copies every layout (their imports are rewritten to `slide-ng/...`, including the helpers `background` and `frame`,
which stay in the package) and the layouts' CSS as `styles/index.css`. For a package it copies the whole package folder without
`node_modules`, `.git` and symbolic links. It refuses a folder that is not empty.

The built-in styles still load before the ejected `styles/index.css`: your copy overrides them rule by rule, so deleting a rule from the
copy brings the built-in one back (to undo it, override it, for example `.slidev-layout.end { background: none }`). A later slide.ng
version can change the built-in rules under your copy.

## How it works (for debugging)

The generator copies each root's folders into `src/slides/generated/roots/<id>/` and merges the `public/` folders into
`src/slides/generated/public/`. It writes `layers.ts`, `setup.ts` (the providers) and `theme.css` (the `@import`s of the styles, the `fonts` and the `themeConfig` variables).
Symbolic links are never copied. In dev mode the folders of themes and addons are watched, so an edit regenerates and reloads.

## Limits

- No theme gallery, no versioning or compatibility check between a theme and the app.
- A layout's inputs are not read from the component (Angular decorators are not parsed): they come from the built-in layout or `theme.json`.
- Class names in a theme are found by UnoCSS in `.ts` files of the roots and in the deck's markdown, not in CSS files.
- Slidev themes are not compatible (they are Vue). Only the folder names are alike.
