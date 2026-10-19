---
name: presenter-notes
description: Speaker notes and the notes PDF
---

# Notes

- The **last HTML comment** of a slide is its note. Markdown works in it. `[click]` and `[click:3]` mark click positions, see `animation-click-marker.md`.
- Notes are shown on `/presenter/<n>`, `/notes` and `/overview` (every slide with its notes and a clicks slider; the quick overview `o` links there). `/entry` links to these pages.
- `slide-ng export-notes` makes a PDF of the notes, see `export-notes.md`.
- `slide-ng build --without-notes` leaves the notes out of the shipped site.
- `notesAutoRuby: { word: reading }` in the headmatter wraps each listed word in `<ruby>word<rt>reading</rt></ruby>` in every slide's note HTML (longest words first; code spans, code blocks and tag attributes are left alone).

<!-- verify -->

```md
---
title: Notes
---

# Slide with a note

<!--
This is the note. It can have **markdown**.
-->
```
