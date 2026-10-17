---
name: draggable
description: slide-ng-drag, slide-ng-drag boxes and arrows, written back into slides.md in dev
---

# Draggable elements

```md
<img slide-ng-drag="[100, 200, 300, 150]" src="/pic.png"> <!-- x, y, width, height, slide pixels -->
<div slide-ng-drag="square">named: numbers in the frontmatter</div>
<div slide-ng-drag>starts where it is and can be moved</div>
<slide-ng-drag pos="100,200,300,_">height follows the content</slide-ng-drag>
<slide-ng-drag-arrow pos="100,100,200,100" color="red" [width]="3" />
```

```yaml
dragPos:
  square: 600,300,100,100
```

- Click an element to select it: corner handles resize (Shift keeps the shape), the round handle above rotates (Shift snaps to 15 degrees), arrow keys nudge 1 px (Shift: 10 px).
- While `slide-ng dev` runs the new place is written back into `slides.md` (a name is written to `dragPos`). A built deck keeps a move only until the page closes.
- Put the element directly in the slide, not inside a positioned wrapper.
- `slide-ng-drag-arrow` takes `pos` (`x,y,width,height`, as Slidev: from (x, y) to (x + width, y + height)), `color`, `[width]`.

<!-- verify -->

```md
---
title: Drag
dragPos:
  square: 600,300,100,100
---

# Drag

<div slide-ng-drag="[100, 200, 300, 150]" class="bg-blue-500 text-white p-2">x, y, width, height</div>

<div slide-ng-drag="square" class="bg-red-500 text-white">named</div>

<slide-ng-drag pos="100,400,300,_">height follows the content</slide-ng-drag>

<slide-ng-drag-arrow pos="100,100,200,100" color="red" [width]="3" />
```
