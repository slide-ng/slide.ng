---
name: clicks
description: slide-ng-click, slide-ng-after, slide-ng-click-hide and the click counts of a slide
---

# Clicks

Add the attribute to any HTML element.

```md
<div slide-ng-click>Shows on the next click</div>
<div slide-ng-click="3">Shows at click 3 (a number is the click with this number)</div>
<div slide-ng-click="+2">Shows two clicks after the previous element</div>
<div [slide-ng-click]="[2, 4]">Shows from click 2 until click 4, then hides</div>
<div slide-ng-after>Same click as the element before it (a relative +0)</div>
<div slide-ng-click="2" slide-ng-click-hide>Visible first, hides at click 2</div>
```

Two forms because of how Angular reads attributes:

- `slide-ng-click="3"` and `slide-ng-click="+2"` are plain text that slide.ng turns into a number or a relative step.
- `[slide-ng-click]="[2, 4]"` is an Angular binding: use it for ranges and for any computed value.

Do not write the Vue forms (`v-click`, `<v-click>`): the old names stop the build with a `renamed to slide-ng-click` message, `<slide-ng-click>` as a tag is a build error, and `slide-ng-click.hide` / `slide-ng-click.hide="2"` are silently ignored. Use `slide-ng-click-hide`.

- Total clicks of a slide = the largest click number its elements ask for. `clicks: N` in the frontmatter fixes it; `clicksStart` sets the first click (default 0).
- The order of elements in the template is what makes `+1` relative work.
- Code line ranges `{1|2|all}`, math ranges, `slide-ng-mark`, `slide-ng-motion`, `<slide-ng-switch>` and `<slide-ng-click-gap>` add clicks too.
- The click is in the URL: `/8?clicks=2`. Going back to a slide lands on its last click.
- In a PDF a slide with clicks shows its last state unless `--with-clicks` is used.

<!-- verify -->

```md
---
title: Clicks
---

# Clicks

<div slide-ng-click>Shows on the first click</div>
<div slide-ng-click="3">Shows at click 3</div>
<div slide-ng-click="+1">One after the previous</div>
<div [slide-ng-click]="[2, 4]">From click 2 until click 4</div>
<div slide-ng-after>Together with the element before</div>
<div slide-ng-click="2" slide-ng-click-hide>Visible first, hides at click 2</div>
```
