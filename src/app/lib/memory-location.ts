import {
  APP_BASE_HREF,
  LocationChangeListener,
  LocationStrategy,
  PlatformLocation,
} from '@angular/common';
import { Injectable, InjectionToken, inject, isDevMode } from '@angular/core';

// Headmatter `routerMode: memory` (Slidev's createMemoryHistory): the router keeps its address in memory, so the address bar
// never changes and a deep link opens slide 1. Only the print pages (`/print`, `/presenter/print`) are read from the address
// at start, because the exporter and `slide-ng build` (PDF, Open Graph picture) open them by URL. In the dev server the
// address is also kept in sessionStorage, so a reload after a save stays on the same slide.

/**
 * Keep the address across a reload of the page, in this tab only (sessionStorage). On in the dev server, which reloads the
 * page on every save: without it each save would go back to slide 1.
 */
export const MEMORY_KEEP = new InjectionToken<boolean>('MEMORY_KEEP', {
  factory: () => isDevMode(),
});
const KEPT = 'slide-ng-memory-location';

interface Entry {
  readonly url: string;
  readonly state: unknown;
}

/** The address to start from: a print page as given, anything else slide 1. `path` is the part after the base, with the query. */
export function memoryStart(path: string): string {
  const clean = '/' + path.replace(/^\/+/, '');
  return /^\/(presenter\/)?print(?:[/?#]|$)/.test(clean) ? clean.replace(/#.*$/, '') : '/';
}

@Injectable()
export class MemoryLocationStrategy extends LocationStrategy {
  private platform = inject(PlatformLocation);
  private readonly baseHref = (
    inject(APP_BASE_HREF, { optional: true }) ??
    this.platform.getBaseHrefFromDOM() ??
    '/'
  ).replace(/\/?$/, '/');
  private entries: Entry[];
  private index = 0;
  private listeners: LocationChangeListener[] = [];
  private keep = inject(MEMORY_KEEP);

  constructor() {
    super();
    const pathname = this.platform.pathname;
    const below = pathname.startsWith(this.baseHref)
      ? pathname.slice(this.baseHref.length)
      : pathname;
    const start = memoryStart(below + this.platform.search);
    this.entries = [{ url: start === '/' ? (this.kept() ?? start) : start, state: null }];
  }

  private kept(): string | null {
    if (!this.keep) return null;
    try {
      const url = sessionStorage.getItem(KEPT);
      return url?.startsWith('/') ? url : null;
    } catch {
      return null; // storage blocked
    }
  }

  private save() {
    if (!this.keep) return;
    try {
      sessionStorage.setItem(KEPT, this.path());
    } catch {
      // storage blocked: the next reload starts at slide 1
    }
  }

  path(): string {
    return this.entries[this.index].url;
  }

  prepareExternalUrl(internal: string): string {
    return this.baseHref + internal.replace(/^\/+/, '');
  }

  getState(): unknown {
    return this.entries[this.index].state;
  }

  pushState(state: unknown, _title: string, url: string, queryParams: string): void {
    this.entries.splice(this.index + 1);
    this.entries.push({ url: join(url, queryParams), state });
    this.index = this.entries.length - 1;
    this.save();
  }

  replaceState(state: unknown, _title: string, url: string, queryParams: string): void {
    this.entries[this.index] = { url: join(url, queryParams), state };
    this.save();
  }

  forward(): void {
    this.historyGo(1);
  }

  back(): void {
    this.historyGo(-1);
  }

  override historyGo(relativePosition = 0): void {
    const next = this.index + relativePosition;
    if (next < 0 || next >= this.entries.length || relativePosition === 0) return;
    this.index = next;
    this.save();
    const event = { type: 'popstate', state: this.getState() } as unknown as PopStateEvent;
    this.listeners.forEach((fn) => fn(event));
  }

  onPopState(fn: LocationChangeListener): void {
    this.listeners.push(fn);
  }

  getBaseHref(): string {
    return this.baseHref;
  }
}

function join(url: string, queryParams: string): string {
  const path = '/' + url.replace(/^\/+/, '');
  return queryParams ? `${path}?${queryParams.replace(/^\?/, '')}` : path;
}
