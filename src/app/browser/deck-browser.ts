import { Injectable, LOCALE_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { Fullscreen } from '../lib/fullscreen';
import { storedSignal } from '../lib/stored-signal';
import { WeatherNow, WeatherPlace, currentWeather, placeName } from './weather';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { SyncState } from '../sync/sync-state';
import {
  DEFAULT_SEARCH,
  FRAMABLE_SEARCH,
  WebProxy,
  searchAddress,
  deckBrowserConfig,
  isProxyOrigin,
  proxiedAddress,
  throughProxy,
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

export type BackgroundKind = 'none' | 'plain' | 'solid' | 'gradient' | 'image';

export interface BackgroundImage {
  id: string;
  data: string;
}

export interface BrowserPrefs {
  search: string | null;
  links: boolean | null;
  bookmarksBar: boolean;
  background: { kind: BackgroundKind; value: string };
  tiles: { bookmarks: boolean; shortcuts: boolean; recent: boolean };
  shuffle: boolean;
  clock: {
    show: boolean;
    format: 'auto' | '12' | '24';
    font: 'light' | 'bold' | 'mono' | 'serif';
    size: 's' | 'm' | 'l';
    date: boolean;
    dateStyle: 'long' | 'short' | 'numeric';
    seconds: boolean;
  };
  theme: 'auto' | 'light' | 'dark';
  weather: { show: boolean; place: WeatherPlace | null; unit: 'c' | 'f' };
}

export const SLIDE_NG_ART = [
  'radial-gradient(ellipse 60% 55% at 18% 12%, rgb(255 122 61 / 0.55), transparent 70%)',
  'radial-gradient(ellipse 55% 50% at 88% 28%, rgb(204 66 9 / 0.5), transparent 70%)',
  'radial-gradient(ellipse 70% 60% at 50% 105%, rgb(126 34 128 / 0.6), transparent 70%)',
  'radial-gradient(ellipse 40% 35% at 70% 75%, rgb(255 122 61 / 0.18), transparent 70%)',
  'linear-gradient(160deg, #1d1016, #2b1322 45%, #150b12)',
].join(', ');

export const BRAND_GRADIENT = 'linear-gradient(135deg, #ff7a3d, #cc4209 55%, #561c08)';

export const SOLID_BACKGROUNDS = [
  '#5b5c61',
  '#000000',
  '#171e91',
  '#4a96f2',
  '#5cbfd8',
  '#2b6580',
  '#84d3b7',
  '#387c5b',
  '#4b7726',
  '#b6cf6b',
  '#e8cb5f',
  '#e58f44',
  '#eb8193',
  '#b0336d',
  '#efb6e9',
  '#c0c4fa',
  '#9179e4',
  '#5034a8',
  '#440a10',
];

export const GRADIENT_BACKGROUNDS = [
  BRAND_GRADIENT,
  'linear-gradient(135deg, #3c2ad6, #7a24a8 55%, #b51f7c)',
  'linear-gradient(135deg, #3b2bd1, #2e7fd6 55%, #20bfd2)',
  'linear-gradient(90deg, #4f33ae, #8b5cf6)',
  'linear-gradient(135deg, #a737e6, #a6306f)',
  'radial-gradient(circle at 80% 90%, #6b2208, #4a0f3d 45%, #05003d 75%)',
  'radial-gradient(circle at 85% 85%, #2a0068, #13002f 50%, #02001a 80%)',
  'linear-gradient(135deg, #47dcd6, #1595ad)',
  'linear-gradient(135deg, #fbd963, #e06c2d)',
  'linear-gradient(135deg, #4f84e6, #6c43d6)',
  'linear-gradient(135deg, #85196a, #cf3b51)',
  'linear-gradient(135deg, #ff7653, #c9283e)',
  'linear-gradient(135deg, #10b981, #0f766e)',
  'linear-gradient(160deg, #1e293b, #0f172a 60%, #000000)',
];

export function isLightBackground(css: string): boolean {
  const colors = css.match(/#[0-9a-f]{6}/gi) ?? [];
  if (!colors.length) return false;
  const light = colors.map((hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  });
  return light.reduce((a, b) => a + b, 0) / light.length > 0.6;
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
  private chosen = new Set<string>();
  private fromPages = new Set<string>();
  private reachable = new Set<string>();
  readonly proxy = signal<WebProxy | null>(null);
  private proxyAsked: Promise<WebProxy | null> | null = null;
  readonly tabs = signal<OpenTab[]>([]);
  readonly activeId = signal<number | null>(null);
  readonly open = signal(false);
  readonly visited = signal<Visited[]>([]);
  readonly bookmarks = storedSignal<Visited[]>('slide-ng-browser-bookmarks', []);
  readonly prefs = storedSignal<BrowserPrefs>('slide-ng-browser-prefs', {
    search: null,
    links: null,
    bookmarksBar: true,
    background: { kind: 'none', value: '' },
    tiles: { bookmarks: true, shortcuts: true, recent: true },
    shuffle: false,
    clock: {
      show: false,
      format: 'auto',
      font: 'light',
      size: 'm',
      date: true,
      dateStyle: 'long',
      seconds: false,
    },
    theme: 'auto',
    weather: { show: false, place: null, unit: 'c' },
  });
  private weatherData = signal<{ key: string; now: WeatherNow } | null>(null);
  readonly weatherNow = computed(() => {
    const { place, unit } = this.prefs().weather;
    const data = this.weatherData();
    return place && data?.key === `${place.lat},${place.lon},${unit}` ? data.now : null;
  });
  private weatherKey = '';
  readonly weatherFailed = signal(false);
  private weatherTimer?: ReturnType<typeof setTimeout>;
  private text = inject(UI_TEXT);
  private locale = inject(LOCALE_ID);
  private weatherAt = 0;
  readonly backgroundImages = storedSignal<BackgroundImage[]>('slide-ng-browser-backgrounds', []);
  readonly startSeed = signal(Math.random());
  readonly startBackground = computed((): { css: string; light: boolean } | null => {
    const { background: bg, shuffle } = this.prefs();
    const pick = <T>(list: T[]) => list[Math.floor(this.startSeed() * list.length)];
    if (bg.kind === 'image') {
      const images = this.backgroundImages();
      if (!images.length) return null;
      const image = shuffle ? pick(images) : (images.find((i) => i.id === bg.value) ?? images[0]);
      return { css: `center / cover no-repeat url(${image.data})`, light: false };
    }
    if (bg.kind === 'none') return { css: SLIDE_NG_ART, light: false };
    if (bg.kind === 'solid' || bg.kind === 'gradient') {
      const list = bg.kind === 'solid' ? SOLID_BACKGROUNDS : GRADIENT_BACKGROUNDS;
      const css = shuffle ? pick(list) : bg.value;
      return css ? { css, light: isLightBackground(css) } : null;
    }
    return null;
  });
  readonly customiseOpen = signal(false);
  readonly search = computed(
    () =>
      searchAddress(this.prefs().search) ??
      this.config.search ??
      (this.proxy() || this.config.proxy ? DEFAULT_SEARCH : FRAMABLE_SEARCH),
  );
  readonly links = computed(() => this.prefs().links ?? this.config.links);
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
    const single = storedSignal<string>('slide-ng-browser-background', '');
    if (single() && !this.backgroundImages().length) {
      this.backgroundImages.set([{ id: 'first', data: single() }]);
      if (this.prefs().background.kind === 'image')
        this.setPrefs({ background: { kind: 'image', value: 'first' } });
    }
    single.set('');
    inject(Fullscreen).lockEscape = true;
    effect(() => {
      const shown = this.shown();
      if (untracked(() => this.sync.shared().browser ?? null) !== shown)
        untracked(() => this.sync.patchShared({ browser: shown }));
    });
    effect(() => {
      const remote = this.sync.shared().browser;
      if (remote === undefined || remote === untracked(() => this.shown())) return;
      untracked(() => (remote ? this.openUrl(remote, '', false) : this.hide()));
    });
    if (typeof window !== 'undefined') window.addEventListener('message', (e) => this.receive(e));
  }

  toggle() {
    if (this.open()) this.hide();
    else this.show();
  }

  show() {
    if (!this.config.enabled) return;
    this.startSeed.set(Math.random());
    this.open.set(true);
    void this.webProxy();
    const tab = this.active();
    if (tab) this.load(tab.id);
    else this.newTab();
  }

  hide() {
    const focused = typeof document === 'undefined' ? null : document.activeElement;
    if (focused instanceof HTMLElement && focused.closest('#deck-browser')) focused.blur();
    this.open.set(false);
  }

  openUrl(address: string, name = '', chosen = true) {
    const url = webAddress(address);
    if (!url || !this.config.enabled) return;
    if (chosen) this.choose(url);
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
    this.startSeed.set(Math.random());
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
    this.choose(url);
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

  addBackgroundImage(data: string): boolean {
    const probe = 'slide-ng-browser-room';
    try {
      localStorage.setItem(probe, data);
      localStorage.removeItem(probe);
    } catch {
      return false;
    }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this.backgroundImages.update((all) => [...all, { id, data }]);
    this.setPrefs({ background: { kind: 'image', value: id } });
    return true;
  }

  removeBackgroundImage(id: string) {
    const rest = this.backgroundImages().filter((i) => i.id !== id);
    this.backgroundImages.set(rest);
    const bg = this.prefs().background;
    if (bg.kind === 'image' && (bg.value === id || !rest.length))
      this.setPrefs({
        background: rest.length
          ? { kind: 'image', value: rest[0].id }
          : { kind: 'none', value: '' },
      });
  }

  refreshWeather(force = false) {
    const { show, place, unit } = this.prefs().weather;
    if (!show || !place) return;
    const key = `${place.lat},${place.lon},${unit}`;
    if (!force && key === this.weatherKey && Date.now() - this.weatherAt < 15 * 60_000) return;
    if (place.name === uiText(this.text, 'browser.weatherHere'))
      void placeName(place.lat, place.lon, this.locale).then((name) => {
        const now = this.prefs().weather;
        if (name && now.place?.lat === place.lat && now.place?.lon === place.lon)
          this.setPrefs({ weather: { ...now, place: { ...now.place, name } } });
      });
    const first = !this.weatherNow();
    const started = Date.now();
    this.weatherKey = key;
    this.weatherAt = started;
    this.weatherFailed.set(false);
    clearTimeout(this.weatherTimer);
    void currentWeather(place, unit).then((now) => {
      if (this.weatherKey !== key) return;
      if (!now) {
        this.weatherKey = '';
        this.weatherFailed.set(true);
        return;
      }
      const wait = first ? Math.max(0, 1000 - (Date.now() - started)) : 0;
      this.weatherTimer = setTimeout(() => {
        if (this.weatherKey === key) this.weatherData.set({ key, now });
      }, wait);
    });
  }

  setPrefs(change: Partial<BrowserPrefs>) {
    this.prefs.update((p) => ({ ...p, ...change }));
  }

  clearRecent() {
    this.visited.set([]);
  }

  clearBookmarks() {
    this.bookmarks.set([]);
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
    const rev = (this.tabs().find((t) => t.id === id)?.rev ?? 0) + 1;
    if (!(proxy && frame && this.post(id, frame, { type: 'reload' }))) this.patch(id, { rev });
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
    if (this.proxy() && frame && this.post(tab.id, frame, { type: 'go', url })) return;
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
    if (tab && message.type === 'escape') {
      if (tab.id === this.activeId()) this.hide();
      return;
    }
    const url = webAddress(message.url);
    if (!tab || !url) return;
    this.origins.set(tab.id, e.origin);
    if (message.type === 'open') {
      this.fromPages.add(url);
      this.openUrl(url, '', false);
      return;
    }
    if (message.type !== 'state') return;
    this.fromPages.add(url);
    const title = typeof message.title === 'string' ? message.title.trim().slice(0, 80) : '';
    const samePage = tab.url === url;
    const name = title || (samePage && tab.name ? tab.name : tabTitle(url));
    const icon = webAddress(message.icon) ?? (samePage && tab.icon ? tab.icon : siteIcon(url));
    if (this.pending.get(tab.id) === url || tab.url === url) {
      this.pending.delete(tab.id);
      this.patch(tab.id, { name, icon });
    } else {
      const history = [...tab.history.slice(0, tab.index + 1), url];
      this.patch(tab.id, { url, name, icon, history, index: history.length - 1 });
    }
    this.remember({ name, url, icon });
  }

  private choose(url: string) {
    if (!this.fromPages.has(url)) this.chosen.add(url);
  }

  private remember(page: Visited) {
    this.visited.update((all) => [page, ...all.filter((v) => v.url !== page.url)].slice(0, 8));
  }

  private load(id: number, force = false) {
    const tab = this.tabs().find((t) => t.id === id);
    if (!tab || (tab.loaded && !force) || !tab.url) return;
    this.patch(id, { loaded: true });
    void this.webProxy().then(async (proxy) => {
      const origin = new URL(tab.url).origin;
      if (proxy && this.chosen.delete(tab.url) && !this.reachable.has(origin))
        if (await this.dev.send('POST', '/web-proxy/open', { url: tab.url }))
          this.reachable.add(origin);
      const now = this.tabs().find((t) => t.id === id);
      if (now?.url !== tab.url) return;
      if (proxy) {
        const src = proxiedAddress(tab.url, proxy);
        this.patch(id, { src, framable: true });
        return;
      }
      if (this.config.proxy) {
        this.patch(id, { src: throughProxy(this.config.proxy, tab.url), framable: true });
        return;
      }
      this.patch(id, { src: tab.url });
      void this.dev
        .get<{ framable: boolean | null }>(`/frame-check?url=${encodeURIComponent(tab.url)}`)
        .then((answer) => {
          if (this.tabs().find((t) => t.id === id)?.url === tab.url)
            this.patch(id, {
              framable: answer?.framable ?? null,
            });
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
    if (!origin || !frame.contentWindow) return false;
    frame.contentWindow.postMessage({ slideNgWeb: command }, origin);
    return true;
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
