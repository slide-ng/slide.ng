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
<div slide-ng-click-hide="3">Visible first, hides at click 3</div>
<div slide-ng-click="2" slide-ng-click-hide="3">Shows at click 2 only, hides at click 3</div>

---
clickAnimation: up
---

# Presets

<div slide-ng-click>Comes up from below</div>
<div slide-ng-click.fade.right>Dimmed, then slides in from the left</div>
<div slide-ng-click.none>No animation</div>
```

Two forms because of how Angular reads attributes:

- `slide-ng-click="3"` and `slide-ng-click="+2"` are plain text that slide.ng turns into a number or a relative step.
- `[slide-ng-click]="[2, 4]"` is an Angular binding: use it for ranges and for any computed value. A range written as text (`slide-ng-click="[2, 4]"`, `slide-ng-click.up="[2, 4]"`) is bound for you, and `[slide-ng-click.up]="[2, 4]"` works too.

Do not write the Vue forms (`v-click`, `<v-click>`): the old names stop the build with a `renamed to slide-ng-click` message, and `<slide-ng-click>` as a tag is a build error. `slide-ng-click.hide` is the same as `slide-ng-click slide-ng-click-hide`: shown first, hidden at its click. With a value on both (`slide-ng-click="2" slide-ng-click-hide="3"`), it shows at the first and hides at the second, like `[slide-ng-click]="[2, 3]"`. A relative hide value (`+1`) counts on from the clicks before it (after `slide-ng-click="+1"`, from the show click). `slide-ng-click-hide="true"` is the bare flag.

Click animation presets (how a hidden element looks): `clickAnimation: up` in the headmatter or a slide's frontmatter (the slide wins), or modifiers that win over both: `slide-ng-click.fade.right="2"`, `slide-ng-after.scale`, `slide-ng-click.none`, `<slide-ng-clicks animation="fade up">`. Presets: `fade` (0.5 opacity while hidden; inert until its click: screen readers skip it, its links take no focus), `fade-in`, `up`, `down`, `left`, `right` (20px), `scale` (0.9), `none` (no transition). A custom preset is CSS on `.slidev-vclick-anim-<name>.slidev-vclick-hidden`.

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
<div slide-ng-click-hide="3">Visible first, hides at click 3</div>
```
