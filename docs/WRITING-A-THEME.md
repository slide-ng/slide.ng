# Writing a theme

A theme in five steps. The rules are in [THEMES.md](THEMES.md); `examples/theme-minimal` is a finished small theme.

## 1. Make the folder

```
my-theme/
  theme.json
  layouts/
  components/
  styles/index.css
  layers/          (optional: global-top.ts, global-bottom.ts, slide-top.ts, slide-bottom.ts)
  setup/           (optional: setup hooks, see below)
  public/          (optional: pictures and fonts, served from /)
  uno.config.mjs   (optional: UnoCSS shortcuts and rules)
```

Put it next to your deck and write `theme: ./my-theme` in the first headmatter. Start with only the parts you need.

## 2. Replace a layout

`my-theme/layouts/quote.ts`:

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'my-quote',
  host: { class: 'slidev-layout my-quote' },
  template: '<div class="my-quote-body"><ng-content /></div>',
})
export class MyQuote {}
```

Any slide with `layout: quote` now uses it. The selector must be a plain string, and the class must be exported.

If your layout reads frontmatter (`author: Ada`), give the component an input of that name and list it in `theme.json`:

```json
{ "layouts": { "quote": { "props": ["author"] } } }
```

The list replaces the built-in layout's inputs, so keep the ones you still want: a `cover` that adds `event` lists
`["background", "event"]`, or a `background:` picture is dropped. The `slide-ng/layouts/background` helper turns that input into the
style the built-in cover uses (see `examples/theme-paper/layouts/cover.ts`).

## 3. Add a component

`my-theme/components/callout.ts` with `selector: 'my-callout'`. Slides can write `<my-callout>text</my-callout>`; the generator
imports it into every slide that uses the tag.

## 4. Add CSS

`my-theme/styles/index.css` is plain CSS and comes after the app's CSS. UnoCSS classes work in the layouts and components too, and
`uno.config.mjs` can add shortcuts:

```js
export default { shortcuts: { 'my-muted': 'op60 text-sm' } };
```

## 5. Default settings

`theme.json` can set headmatter defaults under `"headmatter"`, such as `"colorSchema": "dark"` or the fonts
(`{ "headmatter": { "colorSchema": "dark", "fonts": { "sans": "Titillium Web", "mono": "Fira Code" } } }`; the fonts are loaded from the
provider and merged with the deck's own `fonts`). Keys outside `"name"`, `"headmatter"` and `"layouts"` are not read. Pictures go in `public/`.

Dark mode is the class `dark` on `<html>`: write `html.dark .my-quote { ... }` for the dark palette. The core styles dim the paragraph
right after a heading (`h1 + p`, a subtitle); set its `opacity` in your CSS if your theme should not.

A footer or page number goes in `layers/global-top.ts`. Read the slide's number with `inject(SLIDE_NO)` (from `slide-ng/lib/slide-context`):
`Nav.no()` is the presented slide, so in the PDF it would print the same number on every page. `layers/global-bottom.ts` is drawn under
the slide, so a theme that paints the slide background on `.slidev-layout` hides it.
The official themes (the slide.ng-themes repository, `packages/theme-*`) are larger examples: `bricks` has components, `apple-basic` has layouts with props, `shibainu` has many layouts.

## Extra: setup hooks

`setup/providers.ts` can change shortcuts, or the way code editors run code. The example theme adds a `b` key (back one slide):

```ts
import type { Provider } from '@angular/core';
import { SHORTCUTS_SETUP, type Shortcut, type ShortcutActions } from 'slide-ng/lib/shortcuts';

const providers: Provider[] = [
  {
    provide: SHORTCUTS_SETUP,
    useValue: (actions: ShortcutActions, list: Shortcut[]): Shortcut[] => [
      ...list,
      { name: 'back', key: 'b', run: actions.prevSlide },
    ],
  },
];
export default providers;
```

## Sharing it

A theme is a folder, so publish it as an npm package with these folders at the top of the package. Users install it and write `theme: <name>`.
slide.ng looks for the name in `node_modules` as `@slide-ng/theme-<name>`, then `slide-ng-theme-<name>`, then `<name>`, so name your package
`slide-ng-theme-<name>` (or `@your-scope/...`, used as `theme: @your-scope/theme-x`). The package needs nothing slide.ng reads except the folders:

```json
{
  "name": "slide-ng-theme-ocean",
  "version": "1.0.0",
  "license": "MIT",
  "keywords": ["slide-ng-theme", "slide-ng"],
  "files": [
    "layouts",
    "components",
    "layers",
    "styles",
    "public",
    "setup",
    "theme.json",
    "uno.config.mjs"
  ],
  "peerDependencies": { "@slide-ng/core": "*" }
}
```

The official packages follow this layout; see the slide.ng-themes repository and its CONTRIBUTING.md for adding one. Start from the built-in look
instead of from nothing with `slide-ng theme eject`.

## Checking your theme

Run the deck with `slide-ng` and edit the theme: the folders are watched. Run `slide-ng build` to see the real build (it fails on
a template error in a layout). The repository's own test for the example theme, also installed as a fake `@slide-ng/theme-demo` package to prove the lookup in `node_modules`, is `tests/export/theme.mjs`.
