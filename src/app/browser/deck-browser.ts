import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { SyncState } from '../sync/sync-state';
import { deckBrowserConfig, tabTitle, webAddress } from './browser-config';

export interface OpenTab {
  id: number;
  name: string;
  url: string;
  framable: boolean | null;
  loaded: boolean;
  rev: number;
}

@Injectable({ providedIn: 'root' })
export class DeckBrowser {
  readonly config = deckBrowserConfig();
  private dev = inject(DevApi);
  private nextId = 1;
  readonly tabs = signal<OpenTab[]>(this.config.tabs.map((t) => this.tab(t.url, t.name)));
  readonly activeId = signal<number | null>(this.tabs()[0]?.id ?? null);
  readonly open = signal(false);
  readonly active = computed(() => this.tabs().find((t) => t.id === this.activeId()) ?? null);
  readonly shown = computed(() => (this.open() ? this.active()?.url || null : null));
  private sync = inject(SyncState);

  constructor() {
    if (!this.config.enabled) return;
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
    if (!rest.length) this.hide();
  }

  navigate(id: number, address: string) {
    const url = webAddress(address);
    if (!url) return;
    this.patch(id, { url, name: tabTitle(url), framable: null, loaded: false });
    this.load(id);
  }

  reload(id: number) {
    this.patch(id, { rev: (this.tabs().find((t) => t.id === id)?.rev ?? 0) + 1 });
  }

  private load(id: number) {
    const tab = this.tabs().find((t) => t.id === id);
    if (!tab || tab.loaded || !tab.url) return;
    this.patch(id, { loaded: true });
    void this.dev
      .get<{ framable: boolean | null }>(`/frame-check?url=${encodeURIComponent(tab.url)}`)
      .then((answer) => {
        const now = this.tabs().find((t) => t.id === id);
        if (now?.url === tab.url) this.patch(id, { framable: answer?.framable ?? null });
      });
  }

  private patch(id: number, change: Partial<OpenTab>) {
    this.tabs.update((all) => all.map((t) => (t.id === id ? { ...t, ...change } : t)));
  }

  private tab(url: string, name: string): OpenTab {
    return {
      id: this.nextId++,
      name: name || (url ? tabTitle(url) : ''),
      url,
      framable: null,
      loaded: false,
      rev: 0,
    };
  }
}
