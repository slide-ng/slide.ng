---
name: components
description: Built-in components and directives available in every slide without importing
---

# Built-in components

Use them as lower-case tags. Nothing to import.

| tag                                                                                                                                                                                    | does                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `<slide-ng-toc />`                                                                                                                                                                     | table of contents from slide `title` and `level`. Options `columns="2"`, `listClass`, `start`, `listStyle`, `minDepth`, `maxDepth`, `mode="all\|onlyCurrentTree\|onlySiblings"`      |
| `<slide-ng-current-no />`, `<slide-ng-total />`                                                                                                                                        | current slide number, number of slides                                                                                                                                               |
| `<slide-ng-progress-bar />`                                                                                                                                                            | how far through the deck the slide is, see `layout-progress-bar.md`                                                                                                                  |
| `<slide-ng-title-renderer />`, `<slide-ng-title-renderer no="3" />`                                                                                                                    | draws a slide's title as HTML (inline markdown and `$math$`); without `no`, the slide it is on                                                                                       |
| `<slide-ng-link to="3">text</slide-ng-link>`                                                                                                                                           | link to slide 3 or to a `routeAlias` (Slidev's `Link`)                                                                                                                               |
| `<slide-ng-light-or-dark>`                                                                                                                                                             | `<div dark>...</div>` in dark mode, `<div light>...</div>` in light mode                                                                                                             |
| `<slide-ng-render-when context="slide">`                                                                                                                                               | content only where drawn: `slide`, `presenter`, `print`, `overview`, `main`. `[context]="['slide','overview']"` for several. A child with attribute `fallback` shows everywhere else |
| `<slide-ng-clicks>`, `slide-ng-click`, `slide-ng-after`, `<slide-ng-switch>`, `<slide-ng-click-gap>`                                                                                   | clicks, see `animation-clicks.md`, `animation-click-lists.md`                                                                                                                        |
| `<slide-ng-arrow x1 y1 x2 y2 color width two-way />`                                                                                                                                   | SVG arrow, positions in slide pixels                                                                                                                                                 |
| `<slide-ng-transform scale="0.5" origin="top left">`                                                                                                                                   | scales its content, see `layout-transform.md`                                                                                                                                        |
| `<slide-ng-auto-fit-text min="10" max="60" class="w-60 h-20">`                                                                                                                         | biggest font size that fits the box; `multi-line="false"` for one line                                                                                                               |
| `<slide-ng-youtube id="..." width="560" height="315" />`                                                                                                                               | YouTube embed (no start time or playlist options)                                                                                                                                    |
| `<slide-ng-video autoplay="true" autoreset="click" controls poster="...">`                                                                                                             | video that plays with its slide or click. `autoplay="once"`, `timestamp`. Put `<source>` inside                                                                                      |
| `<slide-ng-tweet id="20" scale="0.8" conversation="none" cards="hidden" />`                                                                                                            | tweet (needs the network)                                                                                                                                                            |
| `<slide-ng-blue-sky uri="at://..." scale="0.8" />`                                                                                                                                     | Bluesky post (needs the network); `uri` can be the post URL                                                                                                                          |
| `slide-ng-drag`, `<slide-ng-drag>`, `<slide-ng-drag-arrow>`                                                                                                                            | draggable elements, see `layout-draggable.md`                                                                                                                                        |
| `slide-ng-mark`, `slide-ng-motion`                                                                                                                                                     | see `animation-marks.md`, `animation-motion.md`                                                                                                                                      |
| `<slide-ng-code-group>`, `<slide-ng-mermaid>`, `<slide-ng-plant-uml>`, `<slide-ng-monaco>`, `<slide-ng-magic-move>`, `<slide-ng-katex-block-wrapper>`, `<slide-ng-code-block-wrapper>` | written by the generator from fences and math; use the markdown forms                                                                                                                |

Not there: `PoweredBySlidev`. `Youtube` is partial.

Table of contents levels: a slide whose level is higher than the one before becomes its child (`# A`, `## A.1`, `## A.2`, `# B`). A slide without a title, or with `hideInToc`, is left out.

<!-- verify -->

```md
---
title: Built-in components
---

# Components

<slide-ng-toc columns="2" />

---
title: Arrow and fit
---

# Arrow and fit text

<slide-ng-arrow x1="40" y1="200" x2="300" y2="300" color="red" width="2" two-way />

<slide-ng-auto-fit-text min="10" max="60" class="w-60 h-20">Fits the box</slide-ng-auto-fit-text>

---

# Counters and links

Slide <slide-ng-current-no /> of <slide-ng-total />, <slide-ng-link to="1">go to slide 1</slide-ng-link>.

Title of slide 1: <slide-ng-title-renderer no="1" />. This slide: <slide-ng-title-renderer />.

<slide-ng-light-or-dark>
<div dark>Dark mode text</div>
<div light>Light mode text</div>
</slide-ng-light-or-dark>

<slide-ng-render-when context="print">
<p>Only on paper.</p>
<div fallback>Not on paper.</div>
</slide-ng-render-when>

---

# Video and embeds

<slide-ng-youtube id="luoMHjh-XcQ" width="560" height="315" />

<slide-ng-video controls>
  <source src="/video.mp4" type="video/mp4">
</slide-ng-video>
```
