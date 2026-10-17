---
name: slots
description: The ::name:: slot sugar for layouts with several parts
---

# Slots

A line with only `::name::` starts a named part of the slide that the layout places somewhere.

```md
---
layout: two-cols
---

# Left (the default slot)

::right::

# Right
```

- `::default::` goes back to the default part, so parts can be written in any order.
- If the layout has no slot with that name, a `[slides]` warning is printed and the text stays in the normal flow.
- Slots of the built-ins: `two-cols`: `left`, `right`; `two-cols-header`: `left`, `right`, `bottom`. Theme layouts declare theirs in `theme.json` (a deck's own layouts in the deck's `theme.json`), and place them with `<ng-content select="[name]" />`.

<!-- verify -->

```md
---
layout: two-cols
---

# Left

::right::

# Right

::default::

Back in the left column.
```
