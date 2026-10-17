---
name: motion
description: slide-ng-motion, a small CSS-transition version of Slidev's
---

# slide-ng-motion

Moves an element between named states with CSS transitions. A small substitute for Slidev's `v-motion`: no spring physics, no presets.

```md
<div slide-ng-motion
  :initial="{ x: -80, opacity: 0 }"
  :enter="{ x: 0, opacity: 1 }"
  :click-1="{ y: 30 }"
  :click-2-4="{ scale: 1.5, transition: { duration: 800 } }"
  :leave="{ x: 80 }">
  Text
</div>
```

- `initial` before the slide, `enter` while shown, `click-N` from click N on (`click-N-M`: from N until M, M not included, later clicks win), `leave` after the slide.
- With `slide-ng-click` on the same element: `initial` before its click, `enter` after.
- Properties: `x`, `y` (px), `scale`, `scaleX`, `scaleY`, `rotate` (deg), `opacity`, and any other CSS property in camelCase; `transition: { duration, delay, ease }` (ms, ms, CSS timing function; default 500 / 0 / `ease-out`).
- Not supported: springs, `hovered`, `tapped`, `focused`, `visible`, keyframe lists, presets.

<!-- verify -->

```md
---
title: Motion
---

# Motion

<div slide-ng-motion
  :initial="{ x: -80, opacity: 0 }"
  :enter="{ x: 0, opacity: 1 }"
  :click-1="{ y: 30 }"
  :click-2-4="{ scale: 1.5, transition: { duration: 800 } }"
  :leave="{ x: 80 }">
  Moves
</div>
```
