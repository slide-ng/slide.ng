---
name: custom-layouts
description: Add or replace a layout with a layouts/ folder
---

# Your own layout

A layout is a standalone Angular component in `layouts/<name>.ts` (deck, theme or addon). `<name>` is what a slide writes in `layout:`. The same name replaces a built-in layout.

- The generator reads the file as text: `@Component({ ... selector: '...' ... })` then `export class Name`. Keep `selector` a string literal.
- Slide content goes into `<ng-content />`. Add the classes `slidev-layout <name>` on the host to inherit layout styling.
- A layout that replaces a built-in one **keeps that layout's inputs** (`cover` keeps `background`): frontmatter keys that are inputs become attributes of your tag, so give your component inputs of the same names. A new layout has no inputs unless `theme.json` lists them:

```json
{ "layouts": { "quote": { "props": ["author"], "slots": [], "classProp": false } } }
```

- `slots` are the names accepted after `::name::`; `classProp: true` sends the slide's `class` to the input `contentClass` instead of the tag.
- A slot's content arrives as an element with the slot name as an attribute: place it with `<ng-content select="[name]" />`.
- A deck's own folder can have a `theme.json` too, to declare the inputs and slots of its own `layouts/`.
- The inputs are not read from the component (Angular decorators are not parsed).
- `slide-ng theme eject` copies the built-in layouts into `./theme/layouts` as a starting point.

<!-- verify-file: layouts/note.ts -->

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'my-note-layout',
  host: { class: 'slidev-layout note block p-10 bg-yellow-100 text-black' },
  template: '<div class="text-2xl"><ng-content /></div>',
})
export class MyNoteLayout {}
```

<!-- verify -->

```md
---
title: Custom layout
---

# Cover

---
layout: note
---

# A note layout

Written in layouts/note.ts.
```
