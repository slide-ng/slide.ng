---
name: marks
description: slide-ng-mark rough-notation marks on clicks
---

# slide-ng-mark

Draws a hand-made mark on an element. It works like `slide-ng-click`; rough-notation is loaded only when used.

```md
<span slide-ng-mark.red.circle="1">circled at click 1</span>
<span slide-ng-mark.underline>underlined one click after the last relative click (here click 1)</span>
<span slide-ng-mark="{ at: 3, type: 'box', color: '#234' }">boxed at click 3</span>
<span slide-ng-mark="[2, 4]">shown at clicks 2 and 3 only</span>
```

- Type modifiers: `underline` (default), `circle`, `highlight`, `box`, `bracket`, `strike-through` (`strike`, `line-through`), `crossed-off` (`cross`).
- Colours: `red`, `blue`, `green`, `orange`, `yellow`, `pink`, `purple`, `teal`, `cyan`, `indigo`, `lime`, `gray`, `black`, `white`.
- `.delay300` waits 300 ms after the click; `.op50` sets opacity.
- The object form takes any rough-notation option (`strokeWidth`, `padding`, `iterations`, `animationDuration`, `brackets`, `multiline`).
- `slide-ng-mark="true"` shows the mark from the start, `false` never.
- A bare `slide-ng-mark` counts like `slide-ng-click`: one after the last relative click (`+1`), not after an absolute number such as `="1"` above.

<!-- verify -->

```md
---
title: Marks
---

# Marks

<span slide-ng-mark.red.circle="1">circled at click 1</span>

<span slide-ng-mark.underline>underlined one click after the last relative click (here click 1)</span>

<span slide-ng-mark="{ at: 3, type: 'box', color: '#234' }">boxed at click 3</span>

<span slide-ng-mark="[2, 4]">shown at clicks 2 and 3 only</span>
```
