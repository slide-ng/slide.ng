---
name: transitions
description: Slide transitions and the direction classes
---

# Transitions

```md
---
transition: slide-left
---
```

- Names: `slide-left`, `slide-right`, `slide-up`, `slide-down` (they reverse when you go backwards), `fade`, `fade-out`, `view-transition` (the browser's View Transitions API; no animation without it).
- `transition: slide-left | slide-right` sets the forward and the backward variant yourself.
- A transition on a slide is used between that slide and the next one, in both directions.
- In the headmatter it applies to every slide that sets none. The default is none.
- Duration: CSS variable `--slidev-transition-duration` (0.5s).
- Any other name is a custom transition in CSS, with Vue's classes: `<name>-enter-from`, `-enter-active`, `-enter-to` on the entering slide, `-leave-from`, `-leave-active`, `-leave-to` on the leaving one. Put the CSS in `styles/index.css`; the classes go when the CSS transition or animation ends.
- The object form names other classes and a fixed duration: `transition: { name: grow, enterFromClass: scale-50, enterActiveClass: transition-transform, duration: 500 }`. Built-in names keep their own animation unless the object names a class.

<!-- verify -->

```md
---
title: Transitions
transition: fade
---

# Fades into the next

---
transition: slide-left | slide-right
---

# Slides left, back to the right

---
transition: view-transition
---

# Browser view transition

---
transition:
  name: grow
  enterFromClass: scale-50
  enterActiveClass: transition-transform duration-500
---

# Grows into the next
```
