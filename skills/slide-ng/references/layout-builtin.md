---
name: layouts
description: The built-in layouts and their frontmatter props
---

# Layouts

`layout: <name>` in a slide's frontmatter. The names and props are the same as Slidev's. An unknown name prints a warning that lists the names and uses `default`. The first slide is `cover`, the others `default`.

| layout                        | use                                                                                                                           | props                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `default`                     | normal content                                                                                                                |                                                          |
| `cover`                       | title slide                                                                                                                   | `background` (colour or image)                           |
| `intro`                       | introduce the talk                                                                                                            |                                                          |
| `center`                      | content in the middle (`class: text-center` centres the text)                                                                 |                                                          |
| `section`                     | start of a section                                                                                                            |                                                          |
| `statement`                   | a statement as the main content                                                                                               |                                                          |
| `fact`                        | one big fact or number                                                                                                        |                                                          |
| `quote`                       | a quotation                                                                                                                   |                                                          |
| `end`                         | last slide; shows `END` when empty                                                                                            |                                                          |
| `full`                        | whole screen, no padding                                                                                                      |                                                          |
| `none`                        | no styling at all                                                                                                             |                                                          |
| `image`                       | an image as the whole slide                                                                                                   | `image`, `backgroundSize`                                |
| `image-left`, `image-right`   | image on one side, content on the other                                                                                       | `image`, `backgroundSize`, `class` (goes to the content) |
| `iframe`                      | a web page as the whole slide                                                                                                 | `url`, `scale`                                           |
| `iframe-left`, `iframe-right` | web page on one side                                                                                                          | `url`, `scale`, `class` (goes to the content)            |
| `two-cols`                    | two columns, slots `::left::` (default text) and `::right::`                                                                  | `class` (both columns), `layoutClass` (whole layout)     |
| `two-cols-header`             | header, two columns, bottom row: `::left::`, `::right::`, `::bottom::`; text before the first marker is the header            | `class`, `layoutClass`                                   |
| `404`, `error`                | `404` is shown when an address matches no slide; `error` only by a slide with `layout: error` (the app never shows it itself) |                                                          |

- `image` is an address (`/photo.png` is served from `public/`) or a colour.
- 21 layouts in total. Theme layouts add more, see `layout-custom.md` and `theme-official.md`.
- Slots: `layout-slots.md`.

<!-- verify -->

```md
---
title: Layouts
---

# Cover

---
layout: intro
---

# Intro

---
layout: section
---

# Section

---
layout: statement
---

# Statement

---
layout: fact
---

# 42

The answer

---
layout: quote
---

# "A quote"

---
layout: two-cols
layoutClass: gap-8
---

# Left

Default slot

::right::

# Right

---
layout: two-cols-header
---

Header text

::left::

Left column

::right::

Right column

::bottom::

Bottom row

---
layout: image-right
image: /photo.png
class: p-4
---

# Image right

---
layout: iframe-left
url: https://example.org
scale: 0.8
---

# Page on the left

---
layout: full
---

# Full

---
layout: end
---
```
