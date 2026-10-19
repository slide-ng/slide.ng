import { Component } from '@angular/core';
import type { Routes } from '@angular/router';

// Routes: one extra page, an Angular component of the deck.
@Component({
  selector: 'setup-hello-page',
  template: '<p id="hello-page">a page from setup/routes.ts</p>',
})
class HelloPage {}

export default (routes: Routes): Routes => [...routes, { path: 'hello', component: HelloPage }];
