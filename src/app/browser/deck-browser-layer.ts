import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DevApi } from '../dev/dev-api';
import { T } from '../i18n/t';
import { IconBtn } from '../ui/icon-btn';
import { typedAddress } from './browser-config';
import { DeckBrowser, OpenTab } from './deck-browser';

@Component({
  selector: 'app-deck-browser',
  imports: [IconBtn, T],
  template: `
    @if (browser.config.enabled) {
      <section
        id="deck-browser"
        class="fixed inset-0 z-modal flex flex-col bg-main text-main"
        [style.display]="browser.open() ? null : 'none'"
        [attr.aria-hidden]="!browser.open()"
        [attr.aria-label]="'browser.label' | t"
        (keydown.escape)="hide($event)"
      >
        <div class="flex items-center gap-1 px-2 pt-2 border-b border-main" role="tablist">
          @for (tab of browser.tabs(); track tab.id) {
            <div
              class="deck-browser-tab group flex items-center max-w-56 min-w-0 rounded-t-md border border-b-0 border-main"
              [class.bg-active]="tab.id === browser.activeId()"
              [class.op70]="tab.id !== browser.activeId()"
            >
              <button
                type="button"
                role="tab"
                class="truncate px-3 py-1.5 text-sm"
                [attr.aria-selected]="tab.id === browser.activeId()"
                [title]="tab.url"
                (click)="browser.select(tab.id)"
              >
                {{ tab.name || ('browser.newTab' | t) }}
              </button>
              <button
                type="button"
                class="deck-browser-close-tab px-1.5 op50 hover:op100"
                [title]="'browser.closeTab' | t"
                [attr.aria-label]="'browser.closeTab' | t"
                (click)="browser.close(tab.id)"
              >
                <div class="i-carbon:close"></div>
              </button>
            </div>
          }
          <button
            icon-btn
            id="deck-browser-new"
            class="text-lg"
            [title]="'browser.newTab' | t"
            (click)="newTab()"
          >
            <div class="i-carbon:add"></div>
          </button>
        </div>

        <form class="flex items-center gap-1 px-2 py-1.5 text-lg" (submit)="go($event)">
          <button
            icon-btn
            type="button"
            id="deck-browser-reload"
            [title]="'browser.reload' | t"
            [disabled]="!browser.active()?.url"
            (click)="reload()"
          >
            <div class="i-carbon:renew"></div>
          </button>
          <input
            #address
            id="deck-browser-address"
            class="flex-1 min-w-0 px-3 py-1 text-sm rounded-md border border-main bg-transparent"
            spellcheck="false"
            autocomplete="off"
            [attr.aria-label]="'browser.address' | t"
            [placeholder]="'browser.addressHint' | t"
            [value]="browser.active()?.url ?? ''"
          />
          @if (hint()) {
            <span class="hidden md:block text-xs op60 px-1">{{ 'browser.maybeBlank' | t }}</span>
          }
          <button
            icon-btn
            type="button"
            id="deck-browser-window"
            [title]="'browser.openWindow' | t"
            [disabled]="!browser.active()?.url"
            (click)="openWindow()"
          >
            <div class="i-carbon:launch"></div>
          </button>
          <button
            icon-btn
            type="button"
            id="deck-browser-hide"
            [title]="'browser.hide' | t"
            (click)="browser.hide()"
          >
            <div class="i-carbon:close"></div>
          </button>
        </form>

        <div #view class="relative flex-1 min-h-0 bg-white">
          @for (tab of browser.tabs(); track tab.id + ':' + tab.rev) {
            @if (tab.loaded && tab.url && tab.framable !== false) {
              <iframe
                class="deck-browser-frame absolute inset-0 w-full h-full border-0"
                [class.invisible]="tab.id !== browser.activeId()"
                [src]="safe(tab)"
                [title]="tab.name"
                [attr.data-tab]="tab.id"
                allow="fullscreen; clipboard-read; clipboard-write; autoplay; encrypted-media; picture-in-picture"
              ></iframe>
            }
          }
          @if (browser.active(); as tab) {
            @if (tab.framable === false) {
              <div
                id="deck-browser-refused"
                class="absolute inset-0 grid place-content-center gap-4 text-center bg-main text-main p-8"
              >
                <div class="i-carbon:locked text-4xl mx-auto op60"></div>
                <p class="max-w-md">{{ 'browser.refused' | t: { site: tab.name } }}</p>
                <button
                  type="button"
                  class="mx-auto px-4 py-2 rounded-md bg-primary text-white"
                  (click)="openWindow()"
                >
                  {{ 'browser.openWindow' | t }}
                </button>
              </div>
            } @else if (!tab.url) {
              <div class="absolute inset-0 grid place-content-center gap-3 bg-main text-main p-8">
                <p class="op70 text-center">{{ 'browser.addressHint' | t }}</p>
                @if (browser.config.tabs.length) {
                  <div class="flex flex-wrap justify-center gap-2">
                    @for (short of browser.config.tabs; track short.url) {
                      <button
                        type="button"
                        class="px-3 py-1.5 rounded-md border border-main hover:bg-active"
                        (click)="browser.navigate(tab.id, short.url)"
                      >
                        {{ short.name }}
                      </button>
                    }
                  </div>
                }
              </div>
            }
          } @else {
            <div class="absolute inset-0 grid place-content-center bg-main text-main op70">
              {{ 'browser.addressHint' | t }}
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class DeckBrowserLayer {
  protected browser = inject(DeckBrowser);
  private sanitizer = inject(DomSanitizer);
  private dev = inject(DevApi);
  private address = viewChild<ElementRef<HTMLInputElement>>('address');
  private view = viewChild<ElementRef<HTMLElement>>('view');
  private urls = new Map<string, SafeResourceUrl>();
  protected hint = computed(() => {
    const tab = this.browser.active();
    return !!tab?.url && tab.framable === null && !this.dev.enabled;
  });

  protected safe(tab: OpenTab): SafeResourceUrl {
    let url = this.urls.get(tab.url);
    if (!url) {
      url = this.sanitizer.bypassSecurityTrustResourceUrl(tab.url);
      this.urls.set(tab.url, url);
    }
    return url;
  }

  protected go(e: Event) {
    e.preventDefault();
    const input = this.address()?.nativeElement;
    const url = typedAddress(input?.value ?? '');
    const tab = this.browser.active();
    if (!url || !input) return;
    if (tab) this.browser.navigate(tab.id, url);
    else this.browser.openUrl(url);
    input.blur();
  }

  protected newTab() {
    this.browser.newTab();
    queueMicrotask(() => this.address()?.nativeElement.focus());
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
