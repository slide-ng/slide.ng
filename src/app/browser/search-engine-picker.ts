import { Component, computed, inject, signal } from '@angular/core';
import { T } from '../i18n/t';
import { SEARCH_ENGINES, searchAddress } from './browser-config';
import { DeckBrowser, siteIcon } from './deck-browser';

@Component({
  selector: 'app-search-engine-picker',
  imports: [T],
  host: { class: 'flex flex-col gap-1' },
  templateUrl: './search-engine-picker.html',
})
export class SearchEnginePicker {
  protected browser = inject(DeckBrowser);
  protected engines = SEARCH_ENGINES;
  protected customEditing = signal(false);
  protected customSearch = computed(
    () => !SEARCH_ENGINES.some((e) => e.url === this.browser.search()),
  );

  protected engineIcon(url: string) {
    return siteIcon(url.replace('%s', ''));
  }

  protected setCustomSearch(input: HTMLInputElement) {
    const url = searchAddress(input.value.trim());
    if (url) {
      this.browser.setPrefs({ search: url });
      this.customEditing.set(false);
    }
  }
}
