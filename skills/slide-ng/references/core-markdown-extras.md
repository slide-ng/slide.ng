---
name: markdown-extras
description: GitHub alerts, task lists and footnotes
---

# Markdown extras

```md
> [!NOTE]
> Useful information.

- [x] done
- [ ] to do

A claim[^1].

[^1]: The note is listed at the bottom of the slide.
```

- Alerts: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION`.
- Footnote numbers are not links; a note is one paragraph of inline markdown.

<!-- verify -->

```md
---
title: Markdown extras
---

# Extras

> [!TIP]
> A tip with a title.

- [x] done
- [ ] to do

A claim[^1].

[^1]: Listed at the bottom.
```

- `## Title {#id .class}` puts an id and classes on a heading; `![logo](/logo.png){width=120}` sizes a picture.
- `:emoji:` shortcodes are not converted: type the emoji. A `javascript:` link becomes `#` (with a warning).
