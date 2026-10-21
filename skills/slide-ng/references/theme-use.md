---
name: theme-use
description: Choose a theme or addons, and how names are resolved
---

# Using a theme

```yaml
theme: ./my-theme # a folder next to the deck, an absolute path, a package name, or default
addons:
  - ./my-addon
  - slide-ng-addon-charts
```

- `theme: default` (or `none`, or no `theme:`) is the built-in look.
- A name that is not a path is looked up in `node_modules` from the deck's folder upwards: `@slide-ng/theme-<name>`, then `slide-ng-theme-<name>`, then `<name>`. A scoped name (`@scope/theme-x`) is used as written. Addons: `@slide-ng/addon-<name>`, `slide-ng-addon-<name>`, `<name>`. A name with a slash (`themes/mine`) is a path; `@/themes/mine` is relative to the deck.
- A path that is not a folder, or a package that is not installed, stops the run with the install command (`npm install -D slide-ng-theme-x`; the official names are `@slide-ng/theme-<name>`). In a terminal `dev` and `build` ask first.
- `--theme <name|path>` on `dev`, `build` and `export`, or `SLIDE_NG_THEME`, overrides the headmatter.
- **Slidev themes (`@slidev/theme-*`) are Vue packages and cannot be used.**
- Theme `fonts` and `themeConfig` are merged with the deck's key by key.
- `themeConfig` works as in Slidev: each key with a text or number value becomes the CSS variable `--slidev-theme-<key>` on `<body>`, the key as written. `themeConfig: { primary: '#5d8392' }` recolours `text-primary`, `bg-primary`, `border-primary`, the progress bar and the controls, also in the presenter, the PDF and offline builds. One value for both colour modes. A number gets no unit (`radius: 6` is not a length): write `radius: 6px`.
- Keys are letters, digits, `-`, `_`. A value with `;`, `{`, `}`, `<`, `>`, `\`, a comment, a line break or unclosed quotes or brackets is skipped with a warning, and so is `url(...)` or `image-set(...)` (name pictures in the CSS of the theme or the deck).
- A slide reads the map as `themeConfig` (Slidev's `$slidev.themeConfigs`): write `{{ themeConfig['primary'] }}`; `themeConfig.primary` does not compile (the map has no fixed keys).
- Addons were unit-tested for resolution and merge order only; no deck was built end to end with one.
- Official themes: `theme-official.md`. Write one: `theme-write.md`.
- The slide.ng repository also has example themes to copy into a deck as folders: `examples/theme-minimal`, `theme-paper` (light, editorial), `theme-moss` (dark, green and clay), `theme-blueprint` (navy drafting grid).

<!-- verify -->

```md
---
title: A themed deck
theme: default
themeConfig:
  primary: '#5d8392'
---

# Default theme

<p class="text-primary">Accent colour: {{ themeConfig['primary'] }}</p>
```
