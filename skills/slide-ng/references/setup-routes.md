---
name: setup-routes
description: setup/routes.ts - add pages (Angular routes) to the app
---

# setup/routes.ts

Gets the app's Angular `Routes` and returns the list to use, so a deck can add pages. A page is an Angular component, in the file or imported from the root (`../components/...`). Roots are chained. The app's own routes that match any address (`:no`, the slide, and `**`) are moved last afterwards, so an appended page is reached; a `:lang` route the file adds is not moved (Slidev's router ranks routes; Angular takes the first match).

The page is shown on its own: no slide frame, navigation or slide keys. With `dev --remote` it is not behind the presenter password unless you add a `canActivate`.

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
