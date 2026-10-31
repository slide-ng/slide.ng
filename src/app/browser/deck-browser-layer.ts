import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DevApi } from '../dev/dev-api';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { SlideNgMark } from '../ui/slide-ng-mark';
import { addressOrSearch, tabTitle } from './browser-config';
import { DeckBrowser, OpenTab, Visited, siteIcon } from './deck-browser';

@Component({
  selector: 'app-deck-browser',
  imports: [IconBtn, NgTemplateOutlet, SlideNgMark, T],
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
  protected sections = computed(() => {
    const seen = new Set<string>();
    const pick = (list: Visited[], max: number) =>
      list
        .filter((t) => !this.removed().has(t.url) && !seen.has(t.url) && !!seen.add(t.url))
        .slice(0, max);
    return [
      { key: 'browser.bookmarks' as const, tiles: pick(this.browser.bookmarks(), 12) },
      {
        key: 'browser.shortcuts' as const,
        tiles: pick(
          this.browser.config.tabs.map((t) => ({ ...t, icon: siteIcon(t.url) })),
          12,
        ),
      },
      { key: 'browser.recent' as const, tiles: pick(this.browser.visited(), 8) },
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
    const url = addressOrSearch(input.value, this.browser.config.search);
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
