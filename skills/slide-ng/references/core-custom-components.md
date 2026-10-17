---
name: custom-components
description: Your own Angular standalone components as tags in slides (the components/ folder)
---

# Your own components

Write a **standalone Angular component** in a `components/` folder next to `slides.md` (no `.vue`, no registration file). Any theme or addon can have the same folder.

Rules:

- One `.ts` file per component, directly in `components/` (sub-folders are not scanned; `*.spec.ts` is ignored).
- The decorator is read as text: `@Component({ ... selector: '...' ... })` followed directly by `export class Name`. Keep `selector` a string literal and put no other decorator between `})` and `export class`.
- A tag selector like `hello-box` is used as `<hello-box>`; an attribute selector like `[my-dir]` is used as `my-dir` on any element.
- The generator imports the component into every slide whose markup contains `<hello-box` (or the attribute). Nothing else to do.
- Use `input()` signals for inputs; plain attributes (`title="Note"`) pass text, `[x]="expr"` passes values, `(done)="..."` listens to outputs.
- Content goes in with `<ng-content />`.
- Give the host classes with `host: { class: '...' }`; UnoCSS classes in templates work.
- A component with the same class name as a built-in one replaces it. Layouts go in `layouts/` (see `layout-custom.md`).
- Do not add components to `src/app` or `scripts/lib/registry.mjs`; that is how the built-ins are registered inside the slide.ng repository. For a deck, use `components/`.
- Import slide.ng services with the alias `slide-ng/` (it means `src/app/`), for example `import { Nav } from 'slide-ng/lib/nav'`. Do not reach `src/app` with `../`; between a theme's or deck's own folders (a layout importing `../components/footer`) `../` is fine, since they are copied side by side.
- Components are imported for you in slides only. A layout, layer or component imports the components it uses itself (`imports: [Footer]`), and writes icons as `<span class="i-carbon:x"></span>`.
- A pipe in `components/` (`@Pipe({ name: 'initials' })`) is imported into the slides whose expressions use it: `{{ name | initials }}`.
- Components can import `@angular/common`, `@angular/forms` and `@angular/router` (they come with slide.ng). Never install another `@angular/*` package in the deck: two copies of Angular give a blank page. `@angular/animations` is not included; use `animate.enter`/`animate.leave` or CSS.
- An npm package a component imports is installed next to `slides.md` (`npm i chart.js`); it is found from the deck's folder up, like Node does. Packages slide.ng comes with (Angular, `rxjs`, `shiki`) always come from slide.ng.
- Web components (`<model-viewer>`, `<sl-button>`) are not Angular components: load their script in `setup/main.ts` and list the tags in the headmatter, `customElements: [model-viewer, sl-*]` (`*` is a prefix, `true` allows any tag with a dash). Without it Angular stops with "is not a known element".

<!-- verify-file: components/hello-box.ts -->

```ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'hello-box',
  host: { class: 'block p-4 my-2 border rounded' },
  template: '<strong>{{ title() }}</strong><div><ng-content /></div>',
})
export class HelloBox {
  title = input('Hello');
}
```

<!-- verify-file: components/click-counter.ts -->

```ts
import { Component, inject, signal } from '@angular/core';
import { SLIDE_NO } from 'slide-ng/lib/slide-context';

@Component({
  selector: 'click-counter',
  template: '<button (click)="n.set(n() + 1)">{{ n() }} clicks on slide {{ no }}</button>',
})
export class ClickCounter {
  n = signal(0);
  no = inject(SLIDE_NO);
}
```

<!-- verify -->

```md
---
title: Own components
---

# Own components

<hello-box title="Note">Text inside the box.</hello-box>

<click-counter #c />

The counter says {{ c.n() }}.
```

## Web components

A web component's script is loaded in `setup/main.ts` (which still returns its providers); the tags are listed in `customElements`.

```ts
// setup/main.ts. A real package is imported the same way: import '@google/model-viewer';
customElements.define(
  'hello-star',
  class extends HTMLElement {
    connectedCallback() {
      this.textContent = `★ ${this.getAttribute('label') ?? ''}`;
    }
  },
);

export default () => [];
```

<!-- verify -->

```md
---
title: Web components
customElements: [hello-*]
---

# Web components

<hello-star label="a custom element"></hello-star>
```

## Sharing state in a slide

A slide has no class, so give a component a `#name` and read it in the template: `<click-counter #c />` then `{{ c.n() }}`. Across slides, use a service (`providedIn: 'root'`) that your components inject.

See `core-injection.md` for the tokens and services a component may inject.
