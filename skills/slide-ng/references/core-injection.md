---
name: injection
description: Slidev's $nav, $clicks, $page in slide markup and through Angular injection in components
---

# Reading the deck state (`$slidev` and injection)

In a slide's markup, Slidev's names exist and the changing ones are signals, so they are called: `{{ $clicks() }}`, `{{ $page() }}`, `{{ $renderContext() }}`, `{{ $frontmatter.title }}`, `{{ $nav.currentPage() }}`, `{{ $nav.total }}`, `(click)="$nav.next()"`, `{{ $slidev.configs.title }}`, `$slidev.themeConfigs`. `$page()` is the drawn slide, `$nav.currentPage()` the one on screen. The generator warns about uncalled `{{ $clicks }}` (also in bindings and `@let`); an uncalled one in a comparison (`$page === 2`, `$clicks > 1`) is a build error (TS2367 / TS2365).

A component injects what it needs:

| Slidev                                             | slide.ng (import from `slide-ng/...`)                                                                                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$nav`, `$page`, `$slidev.nav`                     | `Nav` from `slide-ng/lib/nav`: `no()` (or `currentPage()`) current slide, `currentLayout()`, `currentFrontmatter()`, `total`, `clicks()`, `clicksTotal()`, `next()`, `prev()`, `nextSlide()`, `prevSlide()`, `go(no, clicks)` |
| `$clicks`, `$slidev.nav.clicks`                    | `ClicksContext` from `slide-ng/lib/clicks`: `current()`, `total()` signals (one per slide)                                                                                                                                    |
| `$renderContext`                                   | `RENDER_CONTEXT` from `slide-ng/lib/slide-context`: `'slide'`, `'presenter'`, `'previewNext'`, `'print'`, `'overview'`                                                                                                        |
| slide number of this slide                         | `SLIDE_NO` from `slide-ng/lib/slide-context`                                                                                                                                                                                  |
| `$slidev.themeConfigs`                             | `THEME_CONFIG` from `slide-ng/lib/theme-config`: the merged `themeConfig` map; in a slide's markdown it is `themeConfig` (`{{ themeConfig['primary'] }}`)                                                                     |
| `onSlideEnter`, `onSlideLeave`, `useIsSlideActive` | `onSlideEnter(fn)`, `onSlideLeave(fn)`, `isSlideActive()` from `slide-ng/lib/slide-hooks`, see below                                                                                                                          |

In markdown itself `<slide-ng-current-no />`, `<slide-ng-total />` and `<slide-ng-render-when>` work too.

Values are Angular **signals**: call them (`nav.no()`), and use `computed()` or `effect()` for derived values.

<!-- verify-file: components/where-am-i.ts -->

```ts
import { Component, computed, inject } from '@angular/core';
import { Nav } from 'slide-ng/lib/nav';
import { SLIDE_NO } from 'slide-ng/lib/slide-context';

@Component({
  selector: 'where-am-i',
  template: 'Slide {{ mine }}, on screen: {{ shown() }}, {{ left() }} to go',
})
export class WhereAmI {
  private nav = inject(Nav);
  mine = inject(SLIDE_NO);
  shown = computed(() => this.nav.no());
  left = computed(() => this.nav.total - this.nav.no());
}
```

<!-- verify -->

```md
---
title: Injection
---

# Where am I

<where-am-i />

Slide {{ $page() }} of {{ $nav.total }}, click {{ $clicks() }}, in {{ $slidev.configs.title }}

<button (click)="$nav.go(1)">Start</button>
```

## Slide hooks

Call them in an injection context (a field or the constructor). `fn` gets `(to, from)`, slide numbers, `from` undefined when no other slide was shown before.

- `onSlideEnter(fn)`: once the component is drawn if its slide is on screen, and on every return to the slide.
- `onSlideLeave(fn)`: when another slide is shown after this one.
- `isSlideActive()`: a signal, true while the slide is on screen (Slidev's `useIsSlideActive`).

They run on the slide and presenter pages only, not in thumbnails, the next slide preview or the PDF. In the PDF `isSlideActive()` is true for every slide (every slide is drawn at once and `Nav.no()` stays the presented slide, so show content by `SLIDE_NO` there). The deck removes a slide it leaves: keep counts that must survive a visit outside the component. A hook that throws is reported in the console and does not stop the other hooks.

<!-- verify-file: components/enter-count.ts -->

```ts
import { Component, signal } from '@angular/core';
import { isSlideActive, onSlideEnter } from 'slide-ng/lib/slide-hooks';

@Component({
  selector: 'enter-count',
  template: '{{ active() ? "here" : "away" }}, entered {{ n() }} times',
})
export class EnterCount {
  active = isSlideActive();
  n = signal(0);
  constructor() {
    onSlideEnter(() => this.n.update((v) => v + 1));
  }
}
```

<!-- verify -->

```md
---
title: Slide hooks
---

# Entered

<enter-count />
```

Layers (`layout-global-layers.md`) are the usual place for a component that reads the state on every slide.
