---
name: slidev-differences
description: Table of Slidev habits that do not work in slide.ng, with the slide.ng way
---

# If you know Slidev

slide.ng reads the same `slides.md` shape (Slidev's own parser splits slides and reads frontmatter; the markdown inside a slide is converted with `marked`, not markdown-it), with the same layout names, frontmatter keys, code fence options and click directives. What differs is everything that is Vue or Vite.

| Slidev                                                         | slide.ng                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `slidev`, port 3030                                            | `slide-ng`, port **4230**                                                                                                      |
| `pnpm create slidev`                                           | `slide-ng create <folder>`                                                                                                     |
| `v-if`, `v-for`, `:prop`, `@click`, `<script setup>`           | Angular: `@if`, `@for`, `[prop]`, `(click)`, template references                                                               |
| `<v-click>...</v-click>` tag, `v-click`, `v-clicks`            | not available as a tag. Use the attribute `<div slide-ng-click>` or `<slide-ng-clicks>`                                        |
| `<div v-click.hide>`                                           | `<div slide-ng-click.hide>`, the same as `slide-ng-click slide-ng-click-hide`                                                  |
| `<Toc />`, `<Link>`, `<Tweet />` (PascalCase)                  | `<slide-ng-toc />`, `<slide-ng-link>`, `<slide-ng-tweet />` (lower-case, dashes, prefix)                                       |
| `<Link to="3">`                                                | `<slide-ng-link to="3">`; `link` is an HTML tag, so it was renamed                                                             |
| `<SlidevVideo>`                                                | `<slide-ng-video>`                                                                                                             |
| `<carbon:apps />`                                              | `<carbon-apps />` (dash); or the class `i-carbon:apps`                                                                         |
| `$slidev.nav.currentPage`, `$page`                             | `{{ $slidev.nav.currentPage() }}`, `{{ $page() }}` (signals are called)                                                        |
| `onSlideEnter`, `onSlideLeave`, `useIsSlideActive`             | `onSlideEnter`, `onSlideLeave`, `isSlideActive()` from `slide-ng/lib/slide-hooks`, called in a component (`core-injection.md`) |
| Vue components in `components/*.vue`                           | Angular standalone components in `components/*.ts`                                                                             |
| `setup/main.ts` with `defineAppSetup`                          | `setup/main.ts` returns Angular providers                                                                                      |
| `@slidev/theme-x`, Vue themes and addons                       | `@slide-ng/theme-x`; Slidev themes cannot be used                                                                              |
| `comark: true` / MDC syntax                                    | not parsed; delete the key (a deck without MDC syntax is unaffected)                                                           |
| `$clicks`, `$slidev.nav` in markdown                           | `{{ $clicks() }}`, `@if ($clicks() > 1)`, `(click)="$slidev.nav.next()"`                                                       |
| `{{ $slidev.themeConfigs.primary }}`                           | `{{ themeConfig['primary'] }}`; the CSS variables `--slidev-theme-<key>` are the same                                          |
| `v-pre` on an element with a literal `{{ }}`                   | `ngNonBindable` on the element, or `&#123;&#123;` / `\{\{` in text                                                             |
| UnoCSS attributify (`flex="~" p="2"`), variant groups, `prose` | not installed; use classes                                                                                                     |
| smart quotes, `--`, `...` made by markdown-it                  | not converted; type the characters. Raw HTML is never converted in either                                                      |
| `<carbon:x />` is an `<svg>`                                   | it is a `<span class="i-carbon:x">`; CSS for `span` now matches icons                                                          |
| `import x from '../data.json'` in a component                  | `components/` is copied, so `../` leaves it; keep the file inside `components/`                                                |
| `--uno` in `<style>`                                           | not supported; use utility classes in HTML                                                                                     |
| `vite.config.ts`, Vite plugins, `vue.ts`                       | none                                                                                                                           |
| `slidev export` downloads a browser                            | `slide-ng export` needs `CHROME_PATH` or `--executable-path`                                                                   |
| `<script setup>` imports                                       | none; a component imports what it needs                                                                                        |
| markdown-it plugins                                            | none; `setup/transformers.ts` `codeblocks` renders blocks                                                                      |

Same as Slidev: layouts and their props, `::right::` slots, `src:` imports, `defaults:`, `routeAlias`, `clicks`, `transition`, clicks (`slide-ng-after`, `<slide-ng-clicks>`, `<slide-ng-switch>`; Slidev spells them `v-after`, `<v-clicks>`, `<v-switch>`), code `{2,3|5|all}` ranges, `[title]`, `<<<` snippets, code groups, Magic Move, Twoslash, `{monaco}`, KaTeX `$$`, Mermaid, PlantUML, `slide-ng-mark`, `slide-ng-drag` (Slidev: `v-mark`, `v-drag`), `canvasWidth`, `routerMode`, `presenter`, `drawings`, `record`, `export` and `build` flags (`--out`, `--base`, `--format`, `--range`, `--with-clicks`).

If something from Slidev is missing here, check `not-supported.md` before inventing it. To move a whole deck, follow `port-a-slidev-deck.md`.

<!-- verify -->

```md
---
title: Slidev habits translated
---

# Translated

<div slide-ng-click>Attribute form of slide-ng-click</div>
<div slide-ng-click="2" slide-ng-click-hide>Visible first, hides at click 2</div>

<slide-ng-link to="1">back to the start</slide-ng-link>

<carbon-apps /> Slide <slide-ng-current-no /> of <slide-ng-total />
```
