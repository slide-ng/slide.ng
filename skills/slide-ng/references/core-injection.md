---
name: injection
description: Slidev's $nav, $clicks, $page replaced by Angular injection in components
---

# Reading the deck state (instead of `$slidev`)

There is no global `$slidev`, `$nav`, `$clicks` or `$page` in markdown. A component injects what it needs.

| Slidev                                             | slide.ng (import from `slide-ng/...`)                                                                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$nav`, `$page`, `$slidev.nav`                     | `Nav` from `slide-ng/lib/nav`: `no()` current slide, `total`, `clicks()`, `clicksTotal()`, `next()`, `prev()`, `nextSlide()`, `prevSlide()`, `go(no, clicks)`                                |
| `$clicks`, `$slidev.nav.clicks`                    | `ClicksContext` from `slide-ng/lib/clicks`: `current()`, `total()` signals (one per slide)                                                                                                   |
| `$renderContext`                                   | `RENDER_CONTEXT` from `slide-ng/lib/slide-context`: `'slide'`, `'presenter'`, `'previewNext'`, `'print'`, `'overview'`                                                                       |
| slide number of this slide                         | `SLIDE_NO` from `slide-ng/lib/slide-context`                                                                                                                                                 |
| `onSlideEnter`, `onSlideLeave`, `useIsSlideActive` | missing: use `effect()` on `Nav.no()` and `SLIDE_NO`. In the PDF and the overview every slide is drawn at once and `Nav.no()` stays the presented slide, so show content by `SLIDE_NO` there |

In markdown itself use `<slide-ng-current-no />`, `<slide-ng-total />` and `<slide-ng-render-when>`.

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
```

Layers (`layout-global-layers.md`) are the usual place for a component that reads the state on every slide.
