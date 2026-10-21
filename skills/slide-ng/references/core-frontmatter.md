---
name: frontmatter
description: Per-slide frontmatter keys
---

# Slide frontmatter

The YAML block at the top of a slide.

| key                                                                    | meaning                                                                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`                                                               | one of the layouts in `layout-builtin.md`; the first slide is `cover`, others `default`                                                        |
| `class`                                                                | extra UnoCSS classes on the layout (on the content for layouts that have a `class` prop)                                                       |
| `title`                                                                | slide title; otherwise the first `#` heading. Used in the tab, the table of contents and the goto box                                          |
| `level`                                                                | depth in `<slide-ng-toc>`; otherwise the number of `#` in the first heading                                                                    |
| `hideInToc`                                                            | leave out of `<slide-ng-toc>`                                                                                                                  |
| `routeAlias`                                                           | extra address: `routeAlias: intro` opens this slide at `/intro` (`print`, `notes`, `presenter`, `overview`, `entry`, `notes-edit` are refused) |
| `hide`, `disabled`                                                     | slide is left out of the deck                                                                                                                  |
| `clicks`, `clicksStart`                                                | fix the number of clicks; first click number (default 0)                                                                                       |
| `transition`                                                           | transition between this slide and the next                                                                                                     |
| `src`                                                                  | take the slides from another markdown file, see `core-import-slides.md`                                                                        |
| `image`, `url`, `scale`, `backgroundSize`, `background`, `layoutClass` | props of some layouts                                                                                                                          |
| `zoom`, `dragPos`                                                      | see `layout-zoom.md`, `layout-draggable.md`                                                                                                    |

Keys are camelCase, as in Slidev (`hideInToc`, `routeAlias`, `clicksStart`).

<!-- verify -->

```md
---
title: Frontmatter keys
---

# Cover

---
layout: center
class: text-center
title: A custom title
routeAlias: middle
level: 2
transition: slide-left
clicks: 2
---

# Centered slide

<div slide-ng-click>first</div>
<div slide-ng-click>second</div>

---
hideInToc: true
---

# Left out of the table of contents
```
