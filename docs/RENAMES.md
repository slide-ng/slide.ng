# Renamed built-ins

Every built-in element and attribute that you write in `slides.md` starts with the library prefix `slide-ng-`, in kebab case, the way an Angular library names its selectors. The prefix cannot collide with HTML or with a component of your deck or theme, and the names do not look like Vue.

**The rule.** A built-in element or attribute is `slide-ng-` followed by its old name. If the old name already started with `slide-` or `slides-`, that word is replaced, not repeated (`slide-toc` is `slide-ng-toc`, `slides-total` is `slide-ng-total`, `shiki-magic-move` is `slide-ng-magic-move`).

**What keeps its name.** Layout names (`cover`, `two-cols`, ...), headmatter and frontmatter keys, CSS classes (`slidev-*`, utility classes), `$clicks`-style variables, the markdown blocks `::code-group` and `::right::`, code fence options, and children attributes such as `at`, `dark`, `light`, `fallback`. The generator's own attributes (`drag-site`, `mark-mods`) and the app's internal `app-*` and `sn-*` components are not written by authors and are unchanged.

**No aliases.** The old names do not work. A slide that still uses one stops the generator with a message such as `slide 3: "v-click" was renamed to slide-ng-click` or `slide 4: "<Toc>" was renamed to slide-ng-toc`; the old names of every slide are listed in one run. The check is in `scripts/lib/renamed.mjs`. It ignores code samples, and it leaves a name alone when a component of the deck or a theme declares it as its own selector.

Slidev's component names are caught too: the PascalCase form of every element below (`<VClicks>`, `<Toc />`, `<Youtube>`, `<RenderWhen>`, `<LightOrDark>`, `<Arrow>`, `<SlideCurrentNo>`, ...), and `<Link>`, `<SlidevVideo>` (also `<slidev-video>`), `<TitleRenderer>` and `<KaTexBlockWrapper>`.

`<v-click>` and `<v-after>` (Slidev's `<VClick>`, `<VAfter>`) have no element here: wrap the content in `<div slide-ng-click>` or `<div slide-ng-after>`. The message says so.

## Attributes

| old                                                          | new                                                                           |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `v-click`, `[v-click]`                                       | `slide-ng-click`, `[slide-ng-click]`                                          |
| `v-after`                                                    | `slide-ng-after`                                                              |
| `v-click-hide`                                               | `slide-ng-click-hide`                                                         |
| `v-mark` (and `v-mark.red.circle`, `[v-mark]="{ ... }"`)     | `slide-ng-mark` (and `slide-ng-mark.red.circle`, `[slide-ng-mark]="{ ... }"`) |
| `v-motion` (with `:initial`, `:enter`, `:leave`, `:click-N`) | `slide-ng-motion` (same props)                                                |
| `v-drag`                                                     | `slide-ng-drag`                                                               |

## Elements

| old                                     | new                                            |
| --------------------------------------- | ---------------------------------------------- |
| `<v-click>`, `<v-after>`                | `<div slide-ng-click>`, `<div slide-ng-after>` |
| `<v-clicks>`                            | `<slide-ng-clicks>`                            |
| `<v-click-gap>`                         | `<slide-ng-click-gap>`                         |
| `<v-switch>` (children with `at="..."`) | `<slide-ng-switch>` (children with `at="..."`) |
| `<v-drag>`                              | `<slide-ng-drag>`                              |
| `<v-drag-arrow>`                        | `<slide-ng-drag-arrow>`                        |
| `<slide-toc>`, `<toc>`                  | `<slide-ng-toc>`                               |
| `<slide-current-no>`                    | `<slide-ng-current-no>`                        |
| `<slides-total>`                        | `<slide-ng-total>`                             |
| `<slide-link>`                          | `<slide-ng-link>`                              |
| `<slide-video>`, `<slidev-video>`       | `<slide-ng-video>`                             |
| `<light-or-dark>`                       | `<slide-ng-light-or-dark>`                     |
| `<render-when>`                         | `<slide-ng-render-when>`                       |
| `<arrow>`                               | `<slide-ng-arrow>`                             |
| `<transform>`                           | `<slide-ng-transform>`                         |
| `<auto-fit-text>`                       | `<slide-ng-auto-fit-text>`                     |
| `<youtube>`                             | `<slide-ng-youtube>`                           |
| `<tweet>`                               | `<slide-ng-tweet>`                             |
| `<blue-sky>`                            | `<slide-ng-blue-sky>`                          |
| `<mermaid>`                             | `<slide-ng-mermaid>`                           |
| `<plant-uml>`                           | `<slide-ng-plant-uml>`                         |
| `<monaco>`                              | `<slide-ng-monaco>`                            |
| `<code-group>`                          | `<slide-ng-code-group>`                        |
| `<code-block-wrapper>`                  | `<slide-ng-code-block-wrapper>`                |
| `<shiki-magic-move>`                    | `<slide-ng-magic-move>`                        |
| `<katex-block-wrapper>`                 | `<slide-ng-katex-block-wrapper>`               |

The code, math and diagram elements (`<code-group>`, `<code-block-wrapper>`, `<shiki-magic-move>`, `<katex-block-wrapper>`, `<mermaid>`, `<plant-uml>`, `<monaco>`) are written by the generator for code fences and math; you only type them when you use the tag form on purpose (`<slide-ng-mermaid code="..." />`).

## Code names

The runtime classes and files follow: `VClick` is `SlideNgClick` (`src/app/lib/slide-ng-click.ts`), and likewise `SlideNgClicks`, `SlideNgClickGap`, `SlideNgSwitch`, `SlideNgMark`, `SlideNgMotion`, `SlideNgDrag`, `SlideNgDragBox` (the `<slide-ng-drag>` element) and `SlideNgDragArrow`. Components of other classes (`Arrow`, `Youtube`, `SlideToc`, ...) keep their class and file names; only their selectors changed.

## Slidev

Slidev writes `v-click`, `<v-clicks>`, `v-mark`, `v-drag` and so on, and its components in PascalCase (`<Toc />`, `<SlidevVideo>`). A Slidev deck needs these names changed by hand (search for `v-click`, `v-after`, `v-mark`, `v-motion`, `v-drag`, `<v-` and the components) and the tags of the second table; the props and modifiers stay the same. The generator lists every old name it finds, slide by slide.
