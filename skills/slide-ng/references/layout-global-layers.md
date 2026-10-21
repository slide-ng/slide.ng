---
name: layers
description: Global and per-slide layers (global-top, slide-bottom, ...)
---

# Layers

Add any of `layers/global-top.ts`, `global-bottom.ts`, `slide-top.ts`, `slide-bottom.ts` next to `slides.md` (or in a theme or addon). Each default-exports a standalone Angular component.

- `global-*` appear once over or under all slides.
- `slide-*` appear inside every slide; inject `SLIDE_NO` from `slide-ng/lib/slide-context` to know which.
- Layers let clicks through (`pointer-events: none`); give your own elements `pointer-events: auto` if they need the mouse.
- The generator finds them by folder and name, not by selector.
- Built-in tags are not available in a layer by themselves: add each to the component's `imports` (`import { SlideProgressBar } from 'slide-ng/builtin/progress-bar'`, then `imports: [SlideProgressBar]`).

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

<!-- verify -->

```md
---
title: Layers
---

# A deck with a global layer

The text "my talk" is in the top right corner of every slide.
```
