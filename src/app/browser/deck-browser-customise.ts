import {
  Component,
  ElementRef,
  afterNextRender,
  LOCALE_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { T } from '../i18n/t';
import { UiTextKey } from '../i18n/en';
import {
  BackgroundKind,
  BrowserPrefs,
  DeckBrowser,
  SLIDE_NG_ART,
  GRADIENT_BACKGROUNDS,
  SOLID_BACKGROUNDS,
} from './deck-browser';
import { SearchEnginePicker } from './search-engine-picker';
import { findPlace, placeName } from './weather';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { SlideNgMark } from '../ui/slide-ng-mark';

type Section = 'background' | 'appearance' | 'search' | 'shortcuts' | 'clock' | 'weather' | 'links';

const MAX_SIDE = 1600;

@Component({
  selector: 'app-deck-browser-customise',
  imports: [SearchEnginePicker, SlideNgMark, T],
  templateUrl: './deck-browser-customise.html',
})
export class DeckBrowserCustomise {
  protected browser = inject(DeckBrowser);
  protected solids = SOLID_BACKGROUNDS;
  protected gradients = GRADIENT_BACKGROUNDS;
  protected section = signal<Section>('background');
  protected locale = inject(LOCALE_ID);
  private dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  protected sections: { key: Section; label: UiTextKey; icon: string }[] = [
    { key: 'background', label: 'browser.background', icon: 'i-ph:image' },
    { key: 'appearance', label: 'browser.appearance', icon: 'i-ph:circle-half' },
    { key: 'search', label: 'browser.searchEngine', icon: 'i-ph:magnifying-glass' },
    { key: 'shortcuts', label: 'browser.shortcuts', icon: 'i-ph:squares-four' },
    { key: 'clock', label: 'browser.clockDate', icon: 'i-ph:clock' },
    { key: 'weather', label: 'browser.weather', icon: 'i-ph:cloud-sun' },
    { key: 'links', label: 'browser.linksData', icon: 'i-ph:link' },
  ];

  protected tileRows = computed(() => {
    const tiles = this.browser.prefs().tiles;
    const row = (key: keyof typeof tiles, label: UiTextKey) => ({
      label,
      on: tiles[key],
      flip: () => this.setTiles({ [key]: !tiles[key] }),
    });
    return [
      row('bookmarks', 'browser.showBookmarkTiles'),
      row('shortcuts', 'browser.showShortcutTiles'),
      row('recent', 'browser.showRecentTiles'),
    ];
  });
  protected linkRows = computed(() => [
    {
      label: 'browser.openLinks' as UiTextKey,
      on: this.browser.links(),
      flip: () => this.browser.setPrefs({ links: !this.browser.links() }),
    },
    {
      label: 'browser.showBookmarks' as UiTextKey,
      on: this.browser.prefs().bookmarksBar,
      flip: () => this.browser.setPrefs({ bookmarksBar: !this.browser.prefs().bookmarksBar }),
    },
  ]);

  constructor() {
    afterNextRender(() => this.dialog()?.nativeElement.focus());
  }

  protected close() {
    this.browser.customiseOpen.set(false);
  }

  protected art = SLIDE_NG_ART;
  protected bgView = signal<'cards' | 'solid' | 'gradient' | 'image'>('cards');
  protected drillKind = computed(
    () => (this.bgView() === 'solid' ? 'solid' : 'gradient') as 'solid' | 'gradient',
  );
  protected bgTitle = computed<UiTextKey>(() =>
    this.bgView() === 'solid'
      ? 'browser.bgSolid'
      : this.bgView() === 'gradient'
        ? 'browser.bgGradient'
        : 'browser.bgImage',
  );
  protected hasBackground = computed(() => this.browser.prefs().background.kind !== 'plain');
  protected isBrand = computed(() => this.isKind('none'));
  protected solidPreview = computed(() => {
    const bg = this.browser.prefs().background;
    return bg.kind === 'solid' ? bg.value : SOLID_BACKGROUNDS[0];
  });
  protected gradientPreview = computed(() => {
    const bg = this.browser.prefs().background;
    return bg.kind === 'gradient' ? bg.value : GRADIENT_BACKGROUNDS[1];
  });

  protected isKind(kind: BackgroundKind) {
    return this.browser.prefs().background.kind === kind;
  }

  protected shuffleOn(kind: BackgroundKind) {
    return this.browser.prefs().shuffle && this.isKind(kind);
  }

  protected toggleShuffle(kind: 'solid' | 'gradient' | 'image') {
    const on = !this.shuffleOn(kind);
    const bg = this.browser.prefs().background;
    const value =
      bg.kind === kind
        ? bg.value
        : kind === 'solid'
          ? SOLID_BACKGROUNDS[0]
          : kind === 'gradient'
            ? GRADIENT_BACKGROUNDS[0]
            : (this.browser.backgroundImages()[0]?.id ?? '');
    if (kind === 'image' && !value) return;
    this.browser.setPrefs({ shuffle: on, background: { kind, value } });
  }

  protected toggleBackground() {
    this.setBackground(this.hasBackground() ? 'plain' : 'none');
  }

  protected setBackground(kind: BackgroundKind, value = '') {
    this.browser.setPrefs({ background: { kind, value }, shuffle: false });
  }

  protected isBackground(kind: BackgroundKind, value = '') {
    const bg = this.browser.prefs().background;
    return bg.kind === kind && (kind === 'none' || kind === 'plain' || bg.value === value);
  }

  protected themes: { key: 'auto' | 'light' | 'dark'; label: UiTextKey; icon: string }[] = [
    { key: 'auto', label: 'browser.themeAuto', icon: 'i-ph:circle-half' },
    { key: 'light', label: 'browser.themeLight', icon: 'i-ph:sun' },
    { key: 'dark', label: 'browser.themeDark', icon: 'i-ph:moon' },
  ];
  protected clockFonts: { key: 'light' | 'bold' | 'mono' | 'serif'; css: string }[] = [
    { key: 'light', css: 'font-light' },
    { key: 'bold', css: 'font-bold' },
    { key: 'mono', css: 'font-mono' },
    { key: 'serif', css: 'font-serif' },
  ];
  protected clockSizes: ('s' | 'm' | 'l')[] = ['s', 'm', 'l'];
  protected dateStyles: { key: 'long' | 'short' | 'numeric' }[] = [
    { key: 'long' },
    { key: 'short' },
    { key: 'numeric' },
  ];

  protected datePreview(style: 'long' | 'short' | 'numeric') {
    const options: Record<typeof style, Intl.DateTimeFormatOptions> = {
      long: { weekday: 'long', day: 'numeric', month: 'long' },
      short: { weekday: 'short', day: 'numeric', month: 'short' },
      numeric: { day: '2-digit', month: '2-digit', year: 'numeric' },
    };
    return new Intl.DateTimeFormat(
      this.locale.startsWith('en') ? 'en-GB' : this.locale,
      options[style],
    ).format(new Date());
  }

  protected placeError = signal(false);
  private text = inject(UI_TEXT);

  protected setWeather(change: Partial<BrowserPrefs['weather']>) {
    this.browser.setPrefs({ weather: { ...this.browser.prefs().weather, ...change } });
  }

  protected toggleWeather() {
    const { show, place } = this.browser.prefs().weather;
    this.setWeather({ show: !show });
    if (!show && !place) this.useMyLocation();
  }

  protected async findWeatherPlace(input: HTMLInputElement) {
    if (!input.value.trim()) return;
    const place = await findPlace(input.value);
    this.placeError.set(!place);
    this.locationError.set(null);
    if (place) {
      this.setWeather({ place, show: true });
      input.value = '';
    }
  }

  protected locating = signal(false);
  protected locationError = signal<UiTextKey | null>(null);

  protected useMyLocation() {
    if (!navigator.geolocation) {
      this.locationError.set('browser.weatherNoLocation');
      return;
    }
    this.locating.set(true);
    this.locationError.set(null);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = Math.round(p.coords.latitude * 100) / 100;
        const lon = Math.round(p.coords.longitude * 100) / 100;
        const name =
          (await placeName(lat, lon, this.locale)) ?? uiText(this.text, 'browser.weatherHere');
        this.locating.set(false);
        this.setWeather({ show: true, place: { name, lat, lon } });
      },
      (error) => {
        this.locating.set(false);
        this.locationError.set(
          error.code === error.PERMISSION_DENIED
            ? 'browser.weatherDenied'
            : 'browser.weatherNoLocation',
        );
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 },
    );
  }

  protected setClock(change: Partial<BrowserPrefs['clock']>) {
    this.browser.setPrefs({ clock: { ...this.browser.prefs().clock, ...change } });
  }

  protected setTiles(change: Partial<{ bookmarks: boolean; shortcuts: boolean; recent: boolean }>) {
    this.browser.setPrefs({ tiles: { ...this.browser.prefs().tiles, ...change } });
  }

  protected uploadFull = signal(false);

  protected async upload(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    this.uploadFull.set(!this.browser.addBackgroundImage(canvas.toDataURL('image/jpeg', 0.8)));
  }
}
