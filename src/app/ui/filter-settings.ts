import { Component, inject } from '@angular/core';
import { Filters, defaultFilters } from '../lib/filters';
import { ViewPrefs } from '../lib/view-prefs';

type Slider = {
  key: Exclude<keyof Filters, 'invert'>;
  label: string;
  min: number;
  max: number;
  step: number;
};

// Slidev's slide filters: Invert and five sliders, each with a number box.
@Component({
  selector: 'app-filter-settings',
  template: `
    <label class="slidev-form-item">
      <span class="slidev-form-title">
        Invert
        @if (prefs.filters().invert) {
          <i class="slidev-form-dot"></i>
        }
      </span>
      <span class="slidev-checkbox">
        <i class="i-carbon:checkmark" [class.op0]="!prefs.filters().invert"></i>
        <input
          type="checkbox"
          id="filter-invert"
          [checked]="prefs.filters().invert"
          (change)="set('invert', !prefs.filters().invert)"
        />
      </span>
    </label>
    @for (f of sliders; track f.key) {
      <label class="slidev-form-item">
        <span class="slidev-form-title" (dblclick)="set(f.key, defaults[f.key])">
          {{ f.label }}
          @if (prefs.filters()[f.key] !== defaults[f.key]) {
            <i class="slidev-form-dot"></i>
          }
        </span>
        <span class="relative h-22px w-60 flex-auto" (dblclick)="set(f.key, defaults[f.key])">
          <input
            type="range"
            class="slidev-slider absolute inset-0 w-full"
            [id]="'filter-' + f.key"
            [min]="f.min"
            [max]="f.max"
            [step]="f.step"
            [value]="prefs.filters()[f.key]"
            (input)="set(f.key, +$any($event.target).value)"
          />
          <span
            class="absolute top-0 bottom-0 h-full w-1px op75 border-r border-main"
            [style.left.%]="((defaults[f.key] - f.min) / (f.max - f.min)) * 100"
          ></span>
        </span>
        <input
          type="number"
          class="slidev-number"
          [id]="'filter-' + f.key + '-number'"
          [attr.aria-label]="f.label + ' value'"
          [min]="f.min"
          [max]="f.max"
          [step]="f.step"
          [value]="prefs.filters()[f.key]"
          (input)="number(f, $any($event.target).value)"
        />
      </label>
    }
  `,
})
export class FilterSettings {
  protected prefs = inject(ViewPrefs);
  protected defaults = defaultFilters;
  protected sliders: Slider[] = [
    { key: 'brightness', label: 'Brightness', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'contrast', label: 'Contrast', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'saturate', label: 'Saturation', min: 0.5, max: 1.5, step: 0.02 },
    { key: 'sepia', label: 'Sepia', min: -2, max: 2, step: 0.02 },
    { key: 'hueRotate', label: 'Hue Rotate', min: -180, max: 180, step: 0.1 },
  ];

  protected set<K extends keyof Filters>(key: K, value: Filters[K]) {
    this.prefs.filters.update((f) => ({ ...f, [key]: value }));
  }
  protected number(f: Slider, text: string) {
    if (text !== '' && !Number.isNaN(+text)) this.set(f.key, +text);
  }
}
