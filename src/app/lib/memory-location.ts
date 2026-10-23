import {
  APP_BASE_HREF,
  LocationChangeListener,
  LocationStrategy,
  PlatformLocation,
} from '@angular/common';
import { Injectable, InjectionToken, inject, isDevMode } from '@angular/core';
import { scopedKey } from './deck-scope';
import { LANGUAGE_RELOAD } from '../i18n/languages';

// Headmatter `routerMode: memory` (Slidev's createMemoryHistory): the router keeps its address in memory, so the address bar
// never changes and a deep link opens slide 1. Only the print pages (`/print`, `/presenter/print`) are read from the address
// at start, because the exporter and `slide-ng build` (PDF, Open Graph picture) open them by URL. In the dev server the
// address is also kept in sessionStorage, so a reload after a save stays on the same slide. A switch of language (a reload
// too, i18n/languages.ts) keeps the address that way once, in any build.

/**
 * Keep the address across a reload of the page, in this tab only (sessionStorage). On in the dev server, which reloads the
 * page on every save: without it each save would go back to slide 1.
 */
export const MEMORY_KEEP = new InjectionToken<boolean>('MEMORY_KEEP', {
  factory: () => isDevMode(),
});
const KEPT = 'slide-ng-memory-location';
/** The address kept for the one load after a switch of language. */
const KEPT_FOR_LANGUAGE = 'slide-ng-memory-language';

interface Entry {
  readonly url: string;
  readonly state: unknown;
}

/**
 * The address to start from: a print page as given, a slide given as `#/<number>` (the href of a slide link, so a link opened
 * in a new tab shows its slide), anything else slide 1. `path` is the part after the base, with the query; `hash` is the
 * address's `#...`.
 */
export function memoryStart(path: string, hash = ''): string {
  const clean = '/' + path.replace(/^\/+/, '');
  if (/^\/(presenter\/)?print(?:[/?#]|$)/.test(clean)) return clean.replace(/#.*$/, '');
  const slide = /^#\/(\d+)(\?clicks=\d+)?$/.exec(hash);
  return slide ? `/${slide[1]}${slide[2] ?? ''}` : '/';
}

/** The href of slide `no` in memory mode: the deck's own address with `#/<no>`, which `memoryStart` reads. */
export function memorySlideHref(baseHref: string, no: number): string {
  return `${baseHref}#/${no}`;
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
    const start = memoryStart(below + this.platform.search, this.platform.hash);
    // A slide read from the hash is taken once: the address bar goes back to the deck's address, so a reload starts
    // like any other (at slide 1, or at the kept slide in the dev server). A route in the hash that is not read
    // (`#/presenter/2`, `#/overview`) goes too, as it is not where the deck is; an anchor such as `#top` stays.
    if ((start !== '/' && this.platform.hash) || this.platform.hash.startsWith('#/')) {
      this.platform.replaceState(null, '', pathname + this.platform.search);
    }
    this.entries = [{ url: start === '/' ? (this.kept() ?? start) : start, state: null }];
    window.addEventListener(LANGUAGE_RELOAD, () => {
      try {
        sessionStorage.setItem(scopedKey(KEPT_FOR_LANGUAGE), this.path());
      } catch {
        // storage blocked: the page starts at slide 1 in the new language
      }
    });
  }

  private kept(): string | null {
    try {
      const forLanguage = sessionStorage.getItem(scopedKey(KEPT_FOR_LANGUAGE));
      sessionStorage.removeItem(scopedKey(KEPT_FOR_LANGUAGE));
      if (forLanguage?.startsWith('/')) return forLanguage;
      if (!this.keep) return null;
      const url = sessionStorage.getItem(scopedKey(KEPT));
      return url?.startsWith('/') ? url : null;
    } catch {
      return null; // storage blocked
    }
  }

  private save() {
    if (!this.keep) return;
    try {
      sessionStorage.setItem(scopedKey(KEPT), this.path());
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
