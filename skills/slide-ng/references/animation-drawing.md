---
name: drawing
description: Drawing on slides (drauu), its toolbar and the drawings headmatter
---

# Drawing

The pen button in the bar (or the right-click menu) opens a toolbar: pen, line, arrow, ellipse, rectangle, eraser, colours, width, undo, redo, clear, pin. The eraser has no key; use its button.

Keys while it is open: `L` line, `A` arrow, `S` stylus, `R` rectangle, `E` ellipse, `C` clear, digits for colours, Ctrl+Z undo, Escape closes.

Drawings are per slide, shared between windows, and kept in the browser (`localStorage`, per deck: two decks on one site do not share them).

```yaml
drawings:
  enabled: true # false, or dev / build to allow it only in dev / only in the built deck
  persist: true # with `slide-ng dev` running, save .slide-ng/drawings/<slide>.svg; builds show those files
  presenterOnly: false
  syncAll: true # false: viewers' drawings stay on their own screen
```

- With `persist`, commit `.slide-ng/drawings/` if the drawings should ship with the deck.
- Touch handling for drawing was not tried on a real device.

<!-- verify -->

```md
---
title: Drawing
drawings:
  enabled: true
  persist: false
  presenterOnly: false
  syncAll: true
---

# Draw on this slide

Press the pen button in the bar.
```
