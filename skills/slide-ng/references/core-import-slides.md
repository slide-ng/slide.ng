---
name: import-slides
description: Pull slides from other markdown files with src, and how frontmatter merges
---

# Importing slides

A slide whose frontmatter has `src:` is replaced by the slides of that file.

```md
---
src: ./pages/intro.md
class: from-here
---
```

- The path is relative to the markdown file. A range after `#` picks slides: `src: ./pages/intro.md#2,4-6`.
- Keys on the importing slide **win** over the imported slide's keys. The text of the importing slide is ignored.
- A missing file or a circular import is reported when the slides are generated (a warning, so a build goes on), and the slide is skipped. The dev server also names it in a red banner on the page until the file is back.
- `defaults:` in the headmatter gives every slide a base frontmatter; a slide's own keys win.
- Imported files outside the deck's folder cannot be edited by the dev server's side editor.

The imported file is a normal slides file; its first frontmatter is its first slide's, not a headmatter for the deck.

The imported file must be inside the deck's folder or a theme or addon folder, otherwise the build stops with an error; a leading `/` means the deck's folder. `allowOutsideRoot: true` in the deck's own headmatter lifts the rule.

<!-- verify-file: pages/intro.md -->

```md
---
layout: center
---

# Imported one

---

# Imported two

---

# Imported three
```

<!-- verify -->

```md
---
title: Importing
defaults:
  class: text-center
---

# Main deck

---
src: ./pages/intro.md#1-2
class: from-here
---

---

# After the import
```
