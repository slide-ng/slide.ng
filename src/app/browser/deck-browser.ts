import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { Fullscreen } from '../lib/fullscreen';
import { storedSignal } from '../lib/stored-signal';
import { SyncState } from '../sync/sync-state';
import {
  WebProxy,
  deckBrowserConfig,
  isProxyOrigin,
  proxiedAddress,
  tabTitle,
  webAddress,
} from './browser-config';

export interface OpenTab {
  id: number;
  name: string;
  url: string;
  icon: string;
  src: string;
  history: string[];
  index: number;
  framable: boolean | null;
  loaded: boolean;
  rev: number;
}

export interface Visited {
  name: string;
  url: string;
  icon?: string;
}

export const siteIcon = (url: string) => {
  try {
    return new URL('/favicon.ico', url).href;
  } catch {
    return '';
  }
};

@Injectable({ providedIn: 'root' })
export class DeckBrowser {
  readonly config = deckBrowserConfig();
  private dev = inject(DevApi);
  private sync = inject(SyncState);
  private nextId = 1;
  private pending = new Map<number, string>();
  private origins = new Map<number, string>();
  readonly proxy = signal<WebProxy | null>(null);
  private proxyAsked: Promise<WebProxy | null> | null = null;
  readonly tabs = signal<OpenTab[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly open = signal(false);
  readonly visited = signal<Visited[]>([]);
  readonly bookmarks = storedSignal<Visited[]>('slide-ng-browser-bookmarks', []);
  readonly bookmarked = computed(() => {
    const url = this.active()?.url;
    return !!url && this.bookmarks().some((b) => b.url === url);
  });
  readonly active = computed(() => this.tabs().find((t) => t.id === this.activeId()) ?? null);
  readonly canBack = computed(() => (this.active()?.index ?? 0) > 0);
  readonly canForward = computed(() => {
    const tab = this.active();
    return !!tab && tab.index < tab.history.length - 1;
  });
  readonly shown = computed(() => (this.open() ? this.active()?.url || null : null));

  constructor() {
    if (!this.config.enabled) return;
    inject(Fullscreen).lockEscape = true;
    effect(() => {
      const shown = this.shown();
      if (untracked(() => this.sync.shared().browser ?? null) !== shown)
        untracked(() => this.sync.patchShared({ browser: shown }));
    });
    effect(() => {
      const remote = this.sync.shared().browser;
      if (remote === undefined || remote === untracked(() => this.shown())) return;
      untracked(() => (remote ? this.openUrl(remote) : this.hide()));
    });
    if (typeof window !== 'undefined') window.addEventListener('message', (e) => this.receive(e));
  }

  toggle() {
    if (this.open()) this.hide();
    else this.show();
  }

  show() {
    if (!this.config.enabled) return;
    this.open.set(true);
    const tab = this.active();
    if (tab) this.load(tab.id);
    else this.newTab();
  }

  hide() {
    this.open.set(false);
  }

  openUrl(address: string, name = '') {
    const url = webAddress(address);
    if (!url || !this.config.enabled) return;
    const same = this.tabs().find((t) => t.url === url);
    if (same) this.select(same.id);
    else {
      const tab = this.tab(url, name);
      this.tabs.update((all) => [...all, tab]);
      this.select(tab.id);
    }
    this.open.set(true);
  }

  newTab() {
    const tab = this.tab('', '');
    this.tabs.update((all) => [...all, tab]);
    this.activeId.set(tab.id);
    this.open.set(true);
  }

  select(id: number) {
    this.activeId.set(id);
    this.load(id);
  }

  moveTab(id: number, target: number, before: boolean) {
    if (id === target) return;
    const all = this.tabs();
    const moving = all.find((t) => t.id === id);
    if (!moving) return;
    const rest = all.filter((t) => t.id !== id);
    const at = rest.findIndex((t) => t.id === target);
    if (at < 0) return;
    rest.splice(before ? at : at + 1, 0, moving);
    this.tabs.set(rest);
  }

  close(id: number) {
    const all = this.tabs();
    const i = all.findIndex((t) => t.id === id);
    if (i < 0) return;
    const rest = all.filter((t) => t.id !== id);
    this.tabs.set(rest);
    if (this.activeId() === id) {
      const next = rest[Math.min(i, rest.length - 1)];
      this.activeId.set(next?.id ?? null);
      if (next) this.load(next.id);
    }
  }

  navigate(id: number, address: string, name = '') {
    const url = webAddress(address);
    const tab = this.tabs().find((t) => t.id === id);
    if (!url || !tab) return;
    const history = [...tab.history.slice(0, tab.index + 1), url];
    this.patch(id, {
      url,
      name: name || tabTitle(url),
      icon: siteIcon(url),
      history,
      index: history.length - 1,
      framable: null,
      loaded: false,
    });
    this.load(id, true);
  }

  toggleBookmark() {
    const tab = this.active();
    if (!tab?.url) return;
    const url = tab.url;
    this.bookmarks.update((all) =>
      all.some((b) => b.url === url)
        ? all.filter((b) => b.url !== url)
        : [...all, { name: tab.name || tabTitle(url), url, icon: tab.icon }],
    );
  }

  forget(url: string) {
    this.visited.update((all) => all.filter((v) => v.url !== url));
  }

  removeBookmark(url: string) {
    this.bookmarks.update((all) => all.filter((b) => b.url !== url));
  }

  goHome() {
    const tab = this.active();
    if (!tab) {
      this.newTab();
      return;
    }
    if (!tab.url) return;
    const history = [...tab.history.slice(0, tab.index + 1), ''];
    this.patch(tab.id, {
      url: '',
      name: '',
      icon: '',
      src: '',
      history,
      index: history.length - 1,
      framable: null,
      loaded: false,
    });
  }

  back() {
    this.step(-1);
  }

  forward() {
    this.step(1);
  }

  reload(id: number) {
    const frame = this.frame(id);
    const proxy = this.proxy();
    if (proxy && frame?.contentWindow) this.post(id, frame, { type: 'reload' });
    else this.patch(id, { rev: (this.tabs().find((t) => t.id === id)?.rev ?? 0) + 1 });
  }

  private step(by: number) {
    const tab = this.active();
    if (!tab) return;
    const index = tab.index + by;
    const url = tab.history[index];
    if (url === undefined) return;
    this.patch(tab.id, {
      index,
      url,
      name: url ? tabTitle(url) : '',
      icon: url ? siteIcon(url) : '',
    });
    if (!url) {
      this.patch(tab.id, { src: '', framable: null, loaded: false });
      return;
    }
    this.pending.set(tab.id, url);
    const frame = this.frame(tab.id);
    if (this.proxy() && frame) {
      this.post(tab.id, frame, { type: 'go', url });
      return;
    }
    this.patch(tab.id, { framable: null, loaded: false });
    this.load(tab.id);
  }

  private receive(e: MessageEvent) {
    const proxy = this.proxy();
    const message = (
      e.data as { slideNgWeb?: { type?: string; url?: unknown; title?: unknown; icon?: unknown } }
    )?.slideNgWeb;
    if (!proxy || !message || !isProxyOrigin(e.origin, proxy)) return;
    const tab = this.tabs().find((t) => this.frame(t.id)?.contentWindow === e.source);
    const url = webAddress(message.url);
    if (!tab || !url) return;
    this.origins.set(tab.id, e.origin);
    if (message.type === 'open') {
      this.openUrl(url);
      return;
    }
    if (message.type !== 'state') return;
    const title = typeof message.title === 'string' ? message.title.trim().slice(0, 80) : '';
    const name = title || tabTitle(url);
    const icon = webAddress(message.icon) ?? siteIcon(url);
    if (this.pending.get(tab.id) === url || tab.url === url) {
      this.pending.delete(tab.id);
      this.patch(tab.id, { name, icon });
    } else {
      const history = [...tab.history.slice(0, tab.index + 1), url];
      this.patch(tab.id, { url, name, icon, history, index: history.length - 1 });
    }
    this.remember({ name, url, icon });
  }

  private remember(page: Visited) {
    this.visited.update((all) => [page, ...all.filter((v) => v.url !== page.url)].slice(0, 8));
  }

  private load(id: number, force = false) {
    const tab = this.tabs().find((t) => t.id === id);
    if (!tab || (tab.loaded && !force) || !tab.url) return;
    this.patch(id, { loaded: true });
    void this.webProxy().then((proxy) => {
      const now = this.tabs().find((t) => t.id === id);
      if (now?.url !== tab.url) return;
      if (proxy) {
        this.patch(id, { src: proxiedAddress(tab.url, proxy), framable: true });
        return;
      }
      this.patch(id, { src: tab.url });
      void this.dev
        .get<{ framable: boolean | null }>(`/frame-check?url=${encodeURIComponent(tab.url)}`)
        .then((answer) => {
          if (this.tabs().find((t) => t.id === id)?.url === tab.url)
            this.patch(id, { framable: answer?.framable ?? null });
        });
    });
  }

  private webProxy(): Promise<WebProxy | null> {
    this.proxyAsked ??= this.dev.get<WebProxy | null>('/web-proxy').then((proxy) => {
      const valid =
        proxy && typeof proxy.key === 'string' && /^[a-f\d]+$/.test(proxy.key) && proxy.port > 0
          ? proxy
          : null;
      this.proxy.set(valid);
      return valid;
    });
    return this.proxyAsked;
  }

  private frame(id: number): HTMLIFrameElement | null {
    return document.querySelector<HTMLIFrameElement>(`iframe.deck-browser-frame[data-tab="${id}"]`);
  }

  private post(id: number, frame: HTMLIFrameElement, command: { type: string; url?: string }) {
    const origin = this.origins.get(id);
    if (origin) frame.contentWindow?.postMessage({ slideNgWeb: command }, origin);
  }

  private patch(id: number, change: Partial<OpenTab>) {
    this.tabs.update((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t)));
  }

  private tab(url: string, name: string): OpenTab {
    return {
      id: this.nextId++,
      name: name || (url ? tabTitle(url) : ''),
      url,
      icon: url ? siteIcon(url) : '',
      src: '',
      history: url ? [url] : [],
      index: url ? 0 : -1,
      framable: null,
      loaded: false,
      rev: 0,
    };
  }
}
