---
name: click-lists
description: slide-ng-clicks, slide-ng-switch and slide-ng-click-gap
---

# Lists, switches and gaps

```md
<slide-ng-clicks>

- first
- second

</slide-ng-clicks>
```

- Leave an empty line after `<slide-ng-clicks>` and before `</slide-ng-clicks>`, otherwise markdown does not turn the list into HTML.
- Options: `depth="2"` (include nested lists), `every="2"` (items per click), `at="3"` (first click), `hide` (items hide instead of show).

```md
<slide-ng-switch>
  <div at="1">shown at click 1</div>
  <div at="2">shown at click 2</div>
  <div at="3-5">shown at clicks 3 and 4 (the end is not included)</div>
</slide-ng-switch>

<slide-ng-click-gap size="2" />
```

- `<slide-ng-switch>`: one child per click. A number lasts until the next child starts; `3-5` is explicit.
- `<slide-ng-click-gap size="2" />` leaves two clicks empty.

<!-- verify -->

```md
---
title: Click lists
---

# Lists by click

<slide-ng-clicks depth="2" every="1">

- first
  - nested
- second

</slide-ng-clicks>

<slide-ng-switch>
  <div at="1">one</div>
  <div at="2">two</div>
  <div at="3-5">three to five</div>
</slide-ng-switch>

<slide-ng-click-gap size="1" />
```
