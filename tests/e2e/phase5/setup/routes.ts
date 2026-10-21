import { Component, inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { Dark } from 'slide-ng/lib/dark';
import { Nav } from 'slide-ng/lib/nav';

// Routes: one extra page, an Angular component of the deck. It is outside the deck: no Nav, but Dark is there.
@Component({
  selector: 'setup-hello-page',
  template: `<p id="hello-page">a page from setup/routes.ts</p>
    <p id="hello-services">
      {{ nav ? 'nav' : 'no nav' }}, {{ dark.isDark() ? 'dark' : 'light' }}
    </p>`,
})
class HelloPage {
  protected nav = inject(Nav, { optional: true });
  protected dark = inject(Dark);
}

export default (routes: Routes): Routes => [...routes, { path: 'hello', component: HelloPage }];
