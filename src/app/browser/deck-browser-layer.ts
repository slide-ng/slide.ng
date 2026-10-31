import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DevApi } from '../dev/dev-api';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { SlideNgMark } from '../ui/slide-ng-mark';
import { addressOrSearch, tabTitle } from './browser-config';
import { DeckBrowser, OpenTab } from './deck-browser';

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
  protected tiles = computed(() => {
    const seen = new Set<string>();
    return [...this.browser.bookmarks(), ...this.browser.config.tabs, ...this.browser.visited()]
      .filter((t) => !seen.has(t.url) && !!seen.add(t.url))
      .slice(0, 8);
  });

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
