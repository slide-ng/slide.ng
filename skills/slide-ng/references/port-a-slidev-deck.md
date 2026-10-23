---
name: port-a-slidev-deck
description: Step-by-step recipe to port a Slidev deck (slides.md, Vue components, global layers, styles, scripts) to slide.ng, with a worked Vue to Angular example and the pitfalls met on a real 25-slide deck
---

# Port a Slidev deck to slide.ng

This was done on a real talk (25 slides, 4 Vue components, a global footer layer, 2000 lines of CSS, a stats script). Slides that only use HTML, classes and click attributes come out pixel-identical. Almost all the work is in components and in a few markup habits. Read `core-slidev-differences.md` and `not-supported.md` first.

## 1. Inventory

List the original folder before you touch anything and decide for each item where it goes. Never modify the original deck.

| Slidev                                                                          | slide.ng                                                                                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `slides.md`, headmatter                                                         | `slides.md`, same shape; fix keys (step 2)                                                                                 |
| `components/*.vue`                                                              | `components/*.ts` standalone components (step 3)                                                                           |
| `global-top.vue`, `global-bottom.vue`, `slide-*.vue`, `custom-nav-controls.vue` | `layers/global-top.ts`, ..., `layers/custom-nav-controls.ts` with a default export (step 4)                                |
| `style.css`, `styles/index.css`                                                 | `styles/index.css` (step 5)                                                                                                |
| `public/`                                                                       | `public/`, copied as is                                                                                                    |
| `pages/*.md` (`src:`), `snippets/*.ts` (`<<<`)                                  | the same paths; both work unchanged                                                                                        |
| `scripts/`, `package.json` scripts                                              | keep the scripts, rename `slidev` to `slide-ng` (step 6)                                                                   |
| `setup/*.ts`, `layouts/*.vue`, `vite.config.ts`                                 | `setup/*.ts` and `layouts/*.ts` are rewritten (see `setup-overview.md`, `layout-custom.md`); Vite config has no equivalent |
| `uno.config.ts`                                                                 | `uno.config.mjs`                                                                                                           |

Search the deck for what will break: `v-`, `<[A-Z]`, `<[a-z-]*:[a-z]` (icons), `\$slidev`, `\$clicks`, `\$nav`, `\$page` (they need a call, `$clicks()`), `<script`, `comark`, `mdc`.

Make a folder with `slide-ng create <folder>`, then copy the files over. When the package is not installed, link it: `mkdir -p node_modules/@slide-ng && ln -s <slide.ng checkout> node_modules/@slide-ng/core`.

## 2. Headmatter and slides

- Keep `theme`, `colorSchema`, `fonts`, `title`, `info`, `favicon`, `class`, `drawings`, `transition`, `duration`, `layout`, `disabled`, `src`. They work the same. `fonts: { sans: Inter, mono: DM Mono }` loads both from Google Fonts.
- Delete `comark: true` and `mdc: true`. If the deck uses no `::name`, `{.class}` or `:::` MDC syntax, nothing changes. If it does, rewrite those bits as HTML.
- Rename the directives: `v-click` to `slide-ng-click` (also on a component: `<angie-storm slide-ng-click />`), `v-click="4"` to `slide-ng-click="4"`, `v-after`, `v-click.hide`, `v-clicks`, `v-mark`, `v-motion`, `v-drag` as in `core-slidev-differences.md`. A `sed 's/\bv-click\b/slide-ng-click/g'` does the common case.
- Rename tags: `<carbon:bookmark />` to `<carbon-bookmark />`, `<Toc />` to `<slide-ng-toc />`, `<VClick>` to `<div slide-ng-click>`, your own `<CountUp />` to `<count-up />`. The generator lists the built-in names still to rename on every slide in one run.
- `{{ }}` and `$clicks` in markdown: `$clicks`, `$page`, `$renderContext` and the values of `$nav` are signals here, so add the call: `{{ $clicks() }}`, `@if ($page() === 2)`, `$nav.currentPage()`. See the pitfalls below.
- Slide titles, notes, `disabled`, `hide`, `layout`, `class`, `routeAlias` need no change. A slide with a final HTML comment keeps it as its speaker note.

## 3. Components: Vue to Angular

A Vue SFC becomes one `.ts` file. The mapping:

| Vue                                                | Angular                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| `defineProps<{ k?: string }>()`                    | `k = input<string>()`; read it as `k()`                                  |
| `ref(0)`, `computed(() => ...)`                    | `signal(0)`, `computed(() => ...)`; read and write with `n()`, `n.set()` |
| `ref(props.count)` (a copy that you change)        | `linkedSignal(() => this.count())`                                       |
| `watch(source, cb)`, `onMounted`                   | `effect(() => ...)` in the constructor; `afterNextRender`                |
| `onBeforeUnmount`                                  | `inject(DestroyRef).onDestroy(...)`                                      |
| `useNav()` of `@slidev/client`                     | `inject(Nav)`: `no()`, `total`, `clicks()` (`core-injection.md`)         |
| `$clicks`, `useNav().clicks` for this slide        | `inject(ClicksContext).current()` (`$clicks()` in slide markup)          |
| the slide's own number (`closest('.slidev-page')`) | `inject(SLIDE_NO)`                                                       |
| `v-for`, `v-if`, `:class`, `:style`, `@click`      | `@for`, `@if`, `[class.x]="..."`, `[style]="..."`, `(click)="..."`       |
| `import stats from '../stats.json'`                | `import stats from './stats.json'` with the file inside `components/`    |

Before, a Vue counter (the deck's `Counter.vue`):

```vue
<script setup lang="ts">
import { ref } from 'vue'
const props = defineProps({ count: { default: 0 } })
const counter = ref(props.count)
</script>

<template>
  <div flex="~" w="min" border="~ main rounded-md">
    <button border="r main" p="2" font="mono" @click="counter -= 1">-</button>
    <span m="auto" p="2">{{ counter }}</span>
    <button border="l main" p="2" font="mono" @click="counter += 1">+</button>
  </div>
</template>
```

After, in `components/my-counter.ts` (give it a class name that is not `Counter`: the same class name as a built-in replaces it):

<!-- verify-file: components/my-counter.ts -->

```ts
import { Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'my-counter',
  host: { class: 'flex w-min border border-main rounded-md' },
  template: `
    <button class="border-r border-main p-2 font-mono hover:bg-gray-400/20" (click)="n.set(n() - 1)">-</button>
    <span class="m-auto p-2">{{ n() }}</span>
    <button class="border-l border-main p-2 font-mono hover:bg-gray-400/20" (click)="n.set(n() + 1)">+</button>
  `,
})
export class MyCounter {
  count = input(0);
  n = linkedSignal(() => this.count());
}
```

Before, a count-up that starts when its slide is shown (`CountUp.vue`, shortened):

```vue
<script setup lang="ts">
const props = defineProps<{ to?: number; duration?: number }>()
const value = ref(0)
const { currentPage } = useNav()
const el = ref<HTMLElement | null>(null)
const pageOf = () => Number(el.value?.closest('.slidev-page')?.dataset.slidevNo)
onMounted(() => { if (pageOf() === currentPage.value) run() })
watch(currentPage, (p) => (p === pageOf() ? run() : reset()))
</script>
<template><span ref="el"><span class="count-up">{{ value }}</span></span></template>
```

After, in `components/count-up.ts`. The slide asks `SLIDE_NO` instead of looking at the DOM, `Nav.no()` replaces `currentPage`, and in `print` (PDF export) it shows the final number at once:

<!-- verify-file: components/count-up.ts -->

```ts
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Nav } from 'slide-ng/lib/nav';
import { RENDER_CONTEXT, SLIDE_NO } from 'slide-ng/lib/slide-context';

@Component({
  selector: 'count-up',
  template: '<span class="count-up">{{ value() }}</span>',
})
export class CountUp {
  to = input(0);
  duration = input(1800);

  private nav = inject(Nav);
  private slideNo = inject(SLIDE_NO);
  private still = inject(RENDER_CONTEXT) === 'print';
  private shown = signal(0);
  private frame = 0;
  private running = false;

  value = () => (this.still ? this.to() : this.shown());

  constructor() {
    effect(() => (this.nav.no() === this.slideNo ? this.run() : this.reset()));
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }

  private run() {
    if (this.running) return;
    this.running = true;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / this.duration(), 1);
      this.shown.set(Math.round((1 - Math.pow(1 - t, 3)) * this.to()));
      if (t < 1) this.frame = requestAnimationFrame(tick);
      else this.running = false;
    };
    this.frame = requestAnimationFrame(tick);
  }

  private reset() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.shown.set(0);
  }
}
```

In markdown, `$clicks()` reads the clicks of the slide. For values computed from it, a tiny component that exposes them and a template reference (`#cs`) work well:

<!-- verify-file: components/click-state.ts -->

```ts
import { Component, computed, inject } from '@angular/core';
import { ClicksContext } from 'slide-ng/lib/clicks';

@Component({ selector: 'click-state', template: '' })
export class ClickState {
  n = inject(ClicksContext).current;
  level = computed(() => Math.min(Math.max(this.n(), 1), 5));
}
```

<!-- verify -->

```md
---
title: Ported components
---

# Counters and clicks

<my-counter [count]="3" />

<count-up [to]="229" /> merged PRs

---

# Today

<click-state #cs />

<div class="grid gap-2" [class]="'level-' + cs.level()">
  <div slide-ng-click [class.font-bold]="cs.n() === 1">one</div>
  <div slide-ng-click [class.font-bold]="cs.n() === 2">two</div>
</div>
```

Component rules (also in `core-custom-components.md`): `components/` only, one file per component, `selector` a string literal, the decorator directly followed by `export class`. A component is imported into a slide only when the slide contains its tag.

## 4. Global layers

`global-top.vue` becomes `layers/global-top.ts` with a **default export**. `$slidev.nav.currentPage` becomes `inject(SLIDE_NO)` (the number of the slide the layer is drawn on, right in the PDF and the overview too; `Nav.no()` stays the presented slide there) and `.total` becomes `inject(Nav).total`. `v-if` becomes `@if`, `:style` becomes `[style.width.%]`. A `watch([currentPage, clicks], ...)` becomes an `effect` that reads `nav.no()` and `nav.clicks()`. Window listeners go in the constructor and are removed with `DestroyRef`. Layers let clicks through; set `pointer-events: auto` on elements that need the mouse.

<!-- verify-file: layers/global-bottom.ts -->

```ts
import { Component, inject } from '@angular/core';
import { Nav } from 'slide-ng/lib/nav';
import { SLIDE_NO } from 'slide-ng/lib/slide-context';

@Component({
  selector: 'deck-footer',
  template: `
    @if (no > 1 && no < nav.total) {
      <div class="fixed bottom-2 left-0 right-0 px-8 flex justify-between text-sm op60">
        <span>my talk</span>
        <span>{{ no }} / {{ nav.total }}</span>
        <div class="absolute bottom-0 left-0 h-0.5 bg-red-500" [style.width.%]="(no / nav.total) * 100"></div>
      </div>
    }
  `,
})
export default class DeckFooter {
  nav = inject(Nav);
  no = inject(SLIDE_NO);
}
```

<!-- verify -->

```md
---
title: Footer layer
---

# First

---

# Second

---

# Last
```

## 5. Styles, fonts, assets

- Copy `style.css` to `styles/index.css`. The class names of the layouts are the same (`.slidev-layout`, `.slidev-vclick-hidden`, `.slidev-vclick-target`, `.slidev-vclick-current`, `.slidev-code-wrapper`), so CSS that styles them works unchanged. `@import url(...)` lines are moved to the top of the final CSS for you.
- `.slidev-vclick-hidden` overrides (blur instead of fade) work too.
- Fonts come from the `fonts` key. `selfHost: true` or `build --offline` puts them in the build.
- `public/` is copied as is and served at `/`. Write `/logo.png` in markdown and components. A relative picture next to `slides.md` (`./images/x.png`) in a slide's markup is copied into the build too; in components, CSS `url()` and frontmatter, move the file to `public/`.
- `@apply` and `--uno:` work in `styles/` and in `<style>` (written out while generating; an unknown utility gives a warning). Windi's comma in arbitrary values (`grid-cols-[80px,1fr]`) is `_` in UnoCSS (`grid-cols-[80px_1fr]`).
- Icons are `<span>` elements here, not `<svg>`. Selectors like `.rows span` now also match the icon; see the pitfalls.
- Missing UnoCSS names are added in a `uno.config.mjs` next to `slides.md` (`shortcuts`, `rules`, `presets`).

## 6. Scripts

Scripts in `scripts/` are plain Node and stay. Rename `slidev` to `slide-ng` in the `package.json` scripts. The `pre` hooks (`predev`, `prebuild`) only run through `npm run`, not when you call `slide-ng` directly. A component can import a JSON file only from inside `components/` (see pitfalls), so make the script write the file there.

## 7. Build and check

```bash
slide-ng build                 # Angular compiles every slide; a mistake names slide-007
slide-ng dev                   # http://localhost:4230, no [slides] warning lines
slide-ng export                # PDF; needs CHROME_PATH
```

Compare with screenshots, one per slide and per click state:

1. Run the original (`slidev` on 3030) and the port (`slide-ng dev` on 4230) side by side. If `slidev export` cannot run (it needs `playwright-chromium`), screenshot the dev servers instead.
2. Use Playwright (`playwright-core` is in the slide.ng checkout) with `CHROME_PATH`, a 1280x720 viewport, and open `/<n>?clicks=0` and `/<n>?clicks=99` on both. Both servers honour the `clicks` query. Screenshot `#slide-content` (Slidev) and `.canvas` (slide.ng), wait about 2.5 seconds for animations.
3. Resize both images to the same size and compute a mean absolute difference per slide. Slides at 0 are done; read every slide above about 0.3. Slides with random content (a shuffled mascot wall) will always differ.

## 8. Final checklist

- [ ] `slide-ng build` ends with `Built N slides`; `slide-ng dev` shows no `[slides]` warnings.
- [ ] No `v-`, `<[A-Z]`, `<x:y`, `<script`, `comark` left in `slides.md`; every `$clicks`, `$page`, `$nav.currentPage` is called (no `[slides]` warning).
- [ ] Every Vue component has a `.ts` twin; each uses `input()` and signals, not `ref`.
- [ ] Global layers are in `layers/` with a default export.
- [ ] Screenshots of every slide, initial and all clicks, compared with the original.
- [ ] Keys and clicks tried by hand: press right, check hot states and counters; leave and re-enter a slide with a count-up.
- [ ] PDF export has the final numbers (count-ups use the `print` render context).
- [ ] A `PORTING-NOTES.md` lists what changed per file, what differs visually and what was not ported.

## Pitfalls

- **`$clicks` in markdown.** It is a signal: write `{{ $clicks() }}` and `@if ($clicks() > 2)`; the generator warns about `{{ $clicks }}`. In a component inject `ClicksContext` (this slide) or `Nav` (the shown slide).
- **A literal `{{ x }}` in HTML.** Use Angular's `ngNonBindable` where Slidev uses `v-pre` (`<span ngNonBindable>{{ x }}</span>`), or write the braces as `\{\{` or `&#123;&#123;` in text. Inside code fences and inline code it is plain text, no change needed.
- **Relative imports from components.** The `components/` folder is copied into the generated app, so `import x from '../stats.json'` points nowhere (`Could not resolve`). Put data next to the component and import `./stats.json`, or import from the `slide-ng/` alias. Only the folders `layouts`, `components`, `layers`, `styles`, `public`, `setup` are copied.
- **A component class named like a built-in** (`Counter`) silently replaces it. Use another name.
- **`:class` with a static `class`.** `class="bento" [class]="'s' + n"` merges both; `[class.hot]="cond"` toggles one class. Angular templates have no `Math`: compute in the component.
- **Typographic quotes.** Slidev turns `'` into a curly quote, `--` into a dash and `...` into an ellipsis in markdown text (not in raw HTML). slide.ng uses the `marked` converter and leaves the characters as typed. Type the curly quote yourself in headings.
- **Icons are spans.** `<carbon-x />` is `<span class="i-carbon:x">`. CSS written for `svg` is not matched, and `span` selectors now are. Exclude them: `.rows span:where(:not([class^='i-']))`.
- **Attributify and variant groups** work in slides and in the deck's components (`flex="~" border="~ main"`, `hover:(a b)` in a slide). In a component, write a variant group out (`hover:a hover:b`).
- **Slidev's `abs-*` shortcuts** (`abs-br`) exist since this version; older checkouts lack them and the element lands in the page flow.
- **The imported deck is not the deck.** `src:` and `<<<` paths, `disabled: true` and `defaults` work unchanged; a file that is never referenced is not built.
- **The dev console prints `NG0913`** for big images. It is Angular's own dev hint about image size, not an error.
- **Do not edit `scripts/lib/registry.mjs` or `src/app`** to add a component; use `components/`.
- **Template slots.** Slidev's `<template #1>` children of `<v-switch>` and `<template #dark>` of `<LightOrDark>` render nothing here, without a warning. Write `<div at="1">` children for `<slide-ng-switch>` and `<div dark>` / `<div light>` for `<slide-ng-light-or-dark>`.
- **`@click="$slidev.nav.next"`.** Write `(click)="$slidev.nav.next()"` (Angular calls the method in the event binding). `$slidev.configs` and `$slidev.themeConfigs` work as in Slidev.
- **The theme.** Keep `theme:` only for a theme that exists for slide.ng: a Slidev theme name such as `seriph` is looked up as `@slide-ng/theme-seriph` and stops the build when that is not installed. Use `default`, a folder, or a published slide.ng theme.
- **Self-closing HTML tags.** Vue accepts `<div />`; Angular stops with NG5002. Write `<div></div>` (components and `<img />`, `<br />` are fine).
- **Named slots.** A Vue `<template #title>` / `v-slot:title` of your own component becomes an element with an attribute (`<span slot-title>`) and `<ng-content select="[slot-title]" />` in the component. Layout slots are `::name::` lines.
- **Sub-folders of `components/`** are not scanned (`components/logos/x.vue`): put each component file directly in `components/`.
- **An HTML comment is a note.** `<!-- ... -->` at the end of a slide becomes its speaker note, as in Slidev; a porter's own remark there shows in the presenter view.
- **Icons in `components/` and `layers/`.** `<carbon-x />` is rewritten only in slide markdown. In a component template write `<span class="i-carbon:x"></span>`.
- **Theme layouts and components.** A layout imports the components it uses, also those of its own theme: `import { Footer } from '../components/footer'` and `imports: [Footer]` (the theme's folders are copied side by side).
- **Headings beat utility sizes.** `.slidev-layout h4` sets a size, so `<h4 class="text-xs">` keeps the heading size, as in current Slidev; older decks expected the class to win: add `!` (`!text-xs`).
- **Links.** `[x](5)`, `[x](/5)`, `[x](./5)`, `[x](#/5)` and `/alias` move inside the deck as in Slidev, and `http(s)` links open a new tab. Other `/x` and `./x` addresses are plain links here (Slidev made them router links), `[x](#5)` is an anchor (write `5` or `#/5`), and `mailto:` links do not get `target="_blank"`. An `<a href="/4">` written as HTML (`/`, `./` or `#/` with a number or alias, and no attributes but `class`, `id` and `style`) becomes a slide link too; with other attributes it stays a plain link and gets a warning: use `<slide-ng-link to="4">`.
- **`monaco.languages.typescript`** is undefined in this Monaco; use `monaco.typescript.typescriptDefaults` in `setup/monaco.ts`.
