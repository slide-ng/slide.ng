import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HEADMATTER } from '../../slides/generated';
import { DevApi } from '../dev/dev-api';
import { Dark } from '../lib/dark';
import { presenterEnabled } from '../lib/switches';

// The route /entry (Slidev's entry page): links to the pages of the deck, for a second device or a new window.
@Component({
  selector: 'app-entry-page',
  imports: [RouterLink],
  host: { class: 'grid place-items-center h-full bg-main text-main' },
  template: `
    <nav id="entry" class="grid gap-3 w-72 text-lg" aria-label="Pages of this deck">
      <h1 class="text-2xl mb-2">{{ title }}</h1>
      @for (link of links; track link.path) {
        <a
          class="flex items-center gap-3 px-4 py-3 border border-main rounded hover:border-primary hover:text-primary"
          [routerLink]="link.path"
        >
          <span [class]="link.icon"></span>{{ link.label }}
        </a>
      }
    </nav>
  `,
})
export class EntryPage {
  protected readonly title = HEADMATTER['title'] ?? 'slide.ng';
  protected readonly links = [
    { path: '/1', label: 'Slides', icon: 'i-carbon:presentation-file' },
    ...(presenterEnabled()
      ? [{ path: '/presenter/1', label: 'Presenter', icon: 'i-carbon:user-speaker' }]
      : []),
    { path: '/notes', label: 'Notes', icon: 'i-carbon:catalog' },
    { path: '/overview', label: 'Overview', icon: 'i-carbon:list-boxes' },
    ...(inject(DevApi).enabled
      ? [{ path: '/notes-edit', label: 'Notes editor', icon: 'i-carbon:edit' }]
      : []),
  ];

  constructor() {
    inject(Dark);
    inject(Title).setTitle(`${this.title}`);
  }
}
