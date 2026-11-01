import {
  Component,
  DestroyRef,
  ElementRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DevApi } from '../dev/dev-api';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { SlideNgMark } from '../ui/slide-ng-mark';
import { addressOrSearch, tabTitle } from './browser-config';
import { DeckBrowserCustomise } from './deck-browser-customise';
import { weatherCondition, weatherIcon } from './weather';
import { UiTextKey } from '../i18n/en';
import { SearchEnginePicker } from './search-engine-picker';
import { DeckBrowser, OpenTab, Visited, siteIcon } from './deck-browser';

const DATE_STYLES: Record<'long' | 'short' | 'numeric', Intl.DateTimeFormatOptions> = {
  long: { weekday: 'long', day: 'numeric', month: 'long' },
  short: { weekday: 'short', day: 'numeric', month: 'short' },
  numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
};

@Component({
  selector: 'app-deck-browser',
  host: {
    '(document:click)': 'closeSettingsOutside($event)',
    '(window:blur)': 'closeMenu()',
  },
  imports: [DeckBrowserCustomise, IconBtn, NgTemplateOutlet, SearchEnginePicker, SlideNgMark, T],
  templateUrl: './deck-browser-layer.html',
})
export class DeckBrowserLayer {
  protected browser = inject(DeckBrowser);
  private sanitizer = inject(DomSanitizer);
  private dev = inject(DevApi);
  private address = viewChild<ElementRef<HTMLInputElement>>('address');
  private search = viewChild<ElementRef<HTMLInputElement>>('search');
  private view = viewChild<ElementRef<HTMLElement>>('view');
  private urls = new Map<string, SafeResourceUrl>();
  protected hint = computed(() => {
    const tab = this.browser.active();
    return !!tab?.url && tab.framable === null && !this.browser.proxy() && !this.dev.enabled;
  });
  private menu = signal<'settings' | 'bookmarks' | null>(null);
  protected settingsOpen = computed(() => this.menu() === 'settings');
  protected bookmarksOpen = computed(() => this.menu() === 'bookmarks');
  private settingsBox = viewChild<ElementRef<HTMLElement>>('settingsBox');
  private bookmarksBox = viewChild<ElementRef<HTMLElement>>('bookmarksBox');

  protected toggleMenu(name: 'settings' | 'bookmarks') {
    this.menu.update((open) => (open === name ? null : name));
  }

  protected closeMenu(e?: Event) {
    e?.stopPropagation();
    this.menu.set(null);
  }

  protected host(url: string) {
    return tabTitle(url);
  }

  protected toggles = computed(() => [
    {
      key: 'browser.openLinks' as const,
      on: this.browser.links(),
      flip: () => this.browser.setPrefs({ links: !this.browser.links() }),
    },
    {
      key: 'browser.showBookmarks' as const,
      on: this.browser.prefs().bookmarksBar,
      flip: () => this.browser.setPrefs({ bookmarksBar: !this.browser.prefs().bookmarksBar }),
    },
  ]);

  protected closeSettingsOutside(e: MouseEvent) {
    const target = e.target as Node;
    const boxes = [this.settingsBox()?.nativeElement, this.bookmarksBox()?.nativeElement];
    if (this.menu() && !boxes.some((box) => box?.contains(target))) this.menu.set(null);
  }

  constructor() {
    effect(() => {
      if (!this.browser.open()) return;
      const weather = this.browser.prefs().weather;
      if (weather.show) untracked(() => this.browser.refreshWeather());
    });
    const tick = setInterval(() => {
      if (this.browser.open()) this.now.set(new Date());
    }, 1000);
    const weather = setInterval(() => {
      if (this.browser.open()) this.browser.refreshWeather();
    }, 60_000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(tick);
      clearInterval(weather);
    });
  }

  protected frameTabs = computed(() => [...this.browser.tabs()].sort((a, b) => a.id - b.id));
  protected dragging = signal<number | null>(null);
  protected dropMark = signal<{ id: number; before: boolean } | null>(null);

  protected tabDragStart(e: DragEvent, id: number) {
    this.dragging.set(id);
    e.dataTransfer?.setData('text/plain', String(id));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  protected tabDragOver(e: DragEvent, id: number) {
    if (this.dragging() === null) return;
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget as HTMLElement).direction === 'rtl';
    const firstHalf = e.clientX < box.left + box.width / 2;
    this.dropMark.set(id === this.dragging() ? null : { id, before: rtl ? !firstHalf : firstHalf });
  }

  protected tabDrop(e: DragEvent) {
    e.preventDefault();
    const from = this.dragging();
    const mark = this.dropMark();
    if (from !== null && mark) this.browser.moveTab(from, mark.id, mark.before);
    this.tabDragEnd();
  }

  protected tabDragEnd() {
    this.dragging.set(null);
    this.dropMark.set(null);
  }

  private removed = signal(new Set<string>());
  protected removeTile(url: string) {
    this.browser.removeBookmark(url);
    this.browser.forget(url);
    this.removed.update((all) => new Set(all).add(url));
  }
  protected failed = signal(new Set<string>());
  protected iconFailed(url: string) {
    this.failed.update((all) => new Set(all).add(url));
  }
  private locale = inject(LOCALE_ID);
  private now = signal(new Date());
  protected clock = computed(() => {
    const { format, seconds } = this.browser.prefs().clock;
    return new Intl.DateTimeFormat(this.locale, {
      hour: 'numeric',
      minute: '2-digit',
      second: seconds ? '2-digit' : undefined,
      hour12: format === 'auto' ? undefined : format === '12',
    }).format(this.now());
  });

  protected today = computed(() =>
    new Intl.DateTimeFormat(
      this.locale.startsWith('en') ? 'en-GB' : this.locale,
      DATE_STYLES[this.browser.prefs().clock.dateStyle ?? 'long'],
    ).format(this.now()),
  );

  protected dateClass = computed(() => {
    const fonts = {
      light: 'font-medium',
      bold: 'font-bold',
      mono: 'font-mono',
      serif: 'font-serif',
    };
    return fonts[this.browser.prefs().clock.font] ?? 'font-medium';
  });

  protected clockClass = computed(() => {
    const { font, size } = this.browser.prefs().clock;
    const fonts = {
      light: 'font-light',
      bold: 'font-bold',
      mono: 'font-mono',
      serif: 'font-serif',
    };
    const sizes = { s: 'text-3xl', m: 'text-5xl', l: 'text-7xl' };
    return `${fonts[font] ?? 'font-light'} ${sizes[size] ?? 'text-5xl'}`;
  });

  protected searchFocused = signal(false);
  protected weatherIcon = weatherIcon;

  protected weatherText(code: number): UiTextKey {
    return `browser.wx.${weatherCondition(code)}` as UiTextKey;
  }

  protected weekday(date: string) {
    return new Intl.DateTimeFormat(this.locale, { weekday: 'short' }).format(
      new Date(`${date}T12:00:00`),
    );
  }

  protected startStyle = computed(() => {
    const bg = this.browser.startBackground();
    return { background: bg?.css ?? null, dark: !!bg && !bg.light, light: !!bg?.light };
  });

  protected sections = computed(() => {
    const seen = new Set<string>();
    const pick = (list: Visited[], max: number) =>
      list
        .filter((t) => !this.removed().has(t.url) && !seen.has(t.url) && !!seen.add(t.url))
        .slice(0, max);
    const show = this.browser.prefs().tiles;
    return [
      {
        key: 'browser.bookmarks' as const,
        tiles: show.bookmarks ? pick(this.browser.bookmarks(), 12) : [],
      },
      {
        key: 'browser.shortcuts' as const,
        tiles: show.shortcuts
          ? pick(
              this.browser.config.tabs.map((t) => ({ ...t, icon: siteIcon(t.url) })),
              12,
            )
          : [],
      },
      {
        key: 'browser.recent' as const,
        tiles: show.recent ? pick(this.browser.visited(), 8) : [],
      },
    ].filter((section) => section.tiles.length);
  });

  protected label(tile: Visited) {
    const host = tabTitle(tile.url);
    const name = tile.name.replace(/\s+[-–|·•]\s+[^-–|·•]+$/, '').trim();
    return name && name !== tile.url ? name : host;
  }

  protected initial(tile: { name: string; url: string }) {
    return (tile.name || tabTitle(tile.url)).trim().charAt(0) || '?';
  }

  protected safe(tab: OpenTab): SafeResourceUrl {
    let url = this.urls.get(tab.src);
    if (!url) {
      url = this.sanitizer.bypassSecurityTrustResourceUrl(tab.src);
      this.urls.set(tab.src, url);
    }
    return url;
  }

  protected go(e: Event, input: HTMLInputElement) {
    e.preventDefault();
    const url = addressOrSearch(input.value, this.browser.search());
    if (!url) return;
    const tab = this.browser.active();
    if (tab) this.browser.navigate(tab.id, url);
    else this.browser.openUrl(url);
    input.blur();
  }

  protected openTile(url: string, name: string) {
    const tab = this.browser.active();
    if (tab && !tab.url) this.browser.navigate(tab.id, url, name);
    else this.browser.openUrl(url, name);
  }

  protected newTab() {
    this.browser.newTab();
    queueMicrotask(() => (this.search() ?? this.address())?.nativeElement.focus());
  }

  protected reload() {
    const tab = this.browser.active();
    if (tab) this.browser.reload(tab.id);
  }

  protected openWindow() {
    const tab = this.browser.active();
    const box = this.view()?.nativeElement.getBoundingClientRect();
    if (!tab?.url || !box) return;
    const chrome = window.outerHeight - window.innerHeight;
    const features = [
      'popup',
      `left=${Math.round(window.screenX + box.left)}`,
      `top=${Math.round(window.screenY + chrome + box.top)}`,
      `width=${Math.round(box.width)}`,
      `height=${Math.round(box.height)}`,
      'noopener',
    ].join(',');
    window.open(tab.url, `slide-ng-browser-${tab.id}`, features);
  }

  protected hide(e: Event) {
    if ((e as KeyboardEvent).isComposing) return;
    e.stopPropagation();
    this.browser.hide();
  }
}
