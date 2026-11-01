import { Component, inject } from '@angular/core';
import { Filters, defaultFilters } from '../lib/filters';
import { UiTextKey } from '../i18n/en';
import { T } from '../i18n/t';
import { ViewPrefs } from '../lib/view-prefs';

type Slider = {
  key: Exclude<keyof Filters, 'invert'>;
  label: UiTextKey;
  min: number;
  max: number;
  step: number;
};

// Slidev's slide filters: Invert and five sliders, each with a number box.
@Component({
  selector: 'app-filter-settings',
  imports: [T],
  templateUrl: './filter-settings.html',
})
export class FilterSettings {
  protected prefs = inject(ViewPrefs);
  protected defaults = defaultFilters;
  protected sliders: Slider[] = [
    { key: 'brightness', label: 'settings.brightness', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'contrast', label: 'settings.contrast', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'saturate', label: 'settings.saturation', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'sepia', label: 'settings.sepia', min: -2, max: 2, step: 0.02 },
    { key: 'hueRotate', label: 'settings.hueRotate', min: -180, max: 180, step: 0.1 },
  ];

  protected set<K extends keyof Filters>(key: K, value: Filters[K]) {
    this.prefs.filters.update((f) => ({ ...f, [key]: value }));
  }
  protected number(f: Slider, text: string) {
    if (text !== '' && !Number.isNaN(+text)) this.set(f.key, +text);
  }
}
