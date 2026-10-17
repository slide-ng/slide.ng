---
name: theme-write
description: Write a theme or addon as a folder
---

# Writing a theme

A theme is a folder (or an npm package) with any of: `layouts/`, `components/`, `layers/`, `styles/index.css`, `public/`, `setup/`, `uno.config.mjs`, `theme.json`. Start with only what you need and write `theme: ./my-theme`.

1. Replace a layout: `my-theme/layouts/quote.ts`, see `layout-custom.md`.
2. Add a component: `my-theme/components/callout.ts`, see `core-custom-components.md`.
3. Add CSS: `my-theme/styles/index.css` (plain CSS, after the app's CSS). UnoCSS classes work in layouts and components; `uno.config.mjs` can add `shortcuts`.
4. Defaults in `theme.json`.
5. Import from the app with the alias `slide-ng/` (`src/app/`), never `../`.

`theme.json`:

```json
{
  "name": "minimal",
  "headmatter": { "colorSchema": "dark", "transition": "fade" },
  "layouts": { "quote": { "props": ["author"], "slots": [], "classProp": false } },
  "fonts": { "sans": "Titillium Web" }
}
```

- `headmatter`: defaults for the deck; the deck's own wins. `defaults`, `fonts`, `drawings`, `htmlAttrs`, `themeConfig` are merged key by key.
- `colorSchema: light` or `dark` here means the theme has colours for that mode only: every deck using it keeps that mode (the generator warns when a deck asks for another). Leave it out when the theme styles both.
- `layouts.<name>`: `props` become inputs, `slots` are accepted after `::name::`, `classProp: true` sends the slide's `class` to the input `contentClass`.
- Angular providers: `setup/main.ts` (or `setup/providers.ts` default-exporting an array). Tokens: `SHORTCUTS_SETUP`, `CODE_RUNNERS` (`slide-ng/code/runners`), `SYNC_TRANSPORTS` (`slide-ng/sync/transport`).
- `uno.config.mjs` default export is merged into the app's: `presets`, `rules`, `safelist`, `variants` are added; `shortcuts` and `theme` merge key by key.
- Class names in a theme are found by UnoCSS in `.ts` files of the roots and in the deck's markdown, not in CSS files.
- No theme gallery, no versioning or compatibility check.

<!-- verify-file: my-theme/theme.json -->

```json
{
  "name": "my-theme",
  "headmatter": { "transition": "fade" },
  "layouts": { "quote": { "props": ["author"], "slots": [], "classProp": false } }
}
```

<!-- verify-file: my-theme/layouts/quote.ts -->

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'my-quote',
  host: { class: 'slidev-layout my-quote' },
  template:
    '<div class="my-quote-body"><ng-content /></div><div class="my-quote-by">{{ author() }}</div>',
})
export class MyQuote {
  author = input('');
}
```

<!-- verify-file: my-theme/components/callout.ts -->

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'my-callout',
  host: { class: 'my-callout' },
  template: '<strong>{{ title() }}</strong><div><ng-content /></div>',
})
export class MyCallout {
  title = input('Note');
}
```

<!-- verify-file: my-theme/styles/index.css -->

```css
.my-callout {
  display: block;
  padding: 0.5rem 1rem;
  border-left: 4px solid orange;
}
.my-quote-by {
  opacity: 0.6;
}
```

<!-- verify -->

```md
---
title: Deck with its own theme
theme: ./my-theme
---

# Cover

---
layout: quote
author: Ada
---

# "Programs must be written for people to read."

<my-callout title="Tip">Callouts come from the theme.</my-callout>
```
