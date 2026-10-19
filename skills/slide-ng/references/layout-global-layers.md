---
name: layers
description: Global and per-slide layers (global-top, slide-bottom, custom-nav-controls, ...)
---

# Layers

Add any of `layers/global-top.ts`, `global-bottom.ts`, `slide-top.ts`, `slide-bottom.ts`, `custom-nav-controls.ts` next to `slides.md` (or in a theme or addon). Each default-exports a standalone Angular component.

- `global-*` appear once over or under all slides.
- `slide-*` appear inside every slide; inject `SLIDE_NO` from `slide-ng/lib/slide-context` to know which.
- Layers let clicks through (`pointer-events: none`); give your own elements `pointer-events: auto` if they need the mouse.
- `custom-nav-controls` is not on the slide: its content goes at the end of the navigation bar (after the slide counter), on the deck and the presenter page. Use `class="slidev-icon-btn"` and a `title` on a button to match the built-in ones; inject `Nav` from `slide-ng/lib/nav` to move.
- The generator finds them by folder and name, not by selector.

<!-- verify-file: layers/global-top.ts -->

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'my-global-top',
  host: { class: 'fixed top-2 right-2 text-xs op50' },
  template: 'my talk',
})
export default class MyGlobalTop {}
```

<!-- verify-file: layers/custom-nav-controls.ts -->

```ts
import { Component, inject } from '@angular/core';
import { Nav } from 'slide-ng/lib/nav';

@Component({
  selector: 'my-nav-controls',
  template: `<button class="slidev-icon-btn" title="Back to the start" (click)="nav.go(1)">
    <div class="i-carbon:skip-back"></div>
  </button>`,
})
export default class MyNavControls {
  protected nav = inject(Nav);
}
```

<!-- verify -->

```md
---
title: Layers
---

# A deck with a global layer

The text "my talk" is in the top right corner of every slide, and the bar has a "Back to the start" button.
```
