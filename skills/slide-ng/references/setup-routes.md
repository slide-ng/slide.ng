---
name: setup-routes
description: setup/routes.ts - add pages (Angular routes) to the app
---

# setup/routes.ts

Gets the app's Angular `Routes` and returns the list to use, so a deck can add pages. A page is an Angular component, in the file or imported from the root (`../components/...`). Roots are chained. The app's own routes that match any address (`:no`, the slide, and `**`) are moved last afterwards, so an appended page is reached (Slidev's router ranks routes; Angular takes the first match). A `:lang` route the file adds stays in place; a copy of `:no` or `**` with a guard added is moved too.

The page is shown on its own: no slide frame, navigation or slide keys. With `dev --remote` it is not behind the presenter password unless you add a `canActivate`.

The page is outside the deck: `Nav`, `Ui`, `Drawings` and the click context are not there (`inject(Nav)` fails with "No provider", `inject(Nav, { optional: true })` is `null`). It can inject Angular's `Router` (import `RouterLink` for a link back, `routerLink="/1"`), `Dark` from `slide-ng/lib/dark`, and what `setup/main.ts` or `setup/providers.ts` provide.

<!-- verify-file: setup/routes.ts -->

```ts
import { Component } from '@angular/core';
import type { Routes } from '@angular/router';

@Component({ selector: 'deck-about', template: '<h1>About this talk</h1>' })
class About {}

export default (routes: Routes): Routes => [...routes, { path: 'about', component: About }];
```

<!-- verify -->

```md
---
title: Routes setup
---

# Open /about for the extra page
```
