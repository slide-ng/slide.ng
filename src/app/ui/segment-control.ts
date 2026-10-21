import { Component, computed, inject, input, output } from '@angular/core';
import { Dark } from '../lib/dark';

/** Slidev's name-to-colour: a hue from the label, light or dark to suit the scheme. */
export function hashHue(name: string): number {
  const fixed: Record<string, number> = { error: 0, client: 60, Light: 60, Dark: 240 };
  if (fixed[name]) return fixed[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return hash % 360;
}

// Slidev's SegmentControl: small coloured badges in a grey pill, the chosen one lit.
@Component({
  selector: 'app-segment-control',
  template: `
    <div class="flex gap-1 items-center rounded bg-gray/4 p-1 -m-1" role="group">
      @for (o of options(); track o.id) {
        <button
          type="button"
          [id]="o.id"
          class="px-2 py-1 text-xs font-mono whitespace-nowrap rounded cursor-pointer"
          [class.op65]="o.value !== value()"
          [attr.aria-pressed]="o.value === value()"
          [style.color]="o.value === value() ? hsla(o.label, 1) : null"
          [style.background]="o.value === value() ? hsla(o.label, 0.1) : null"
          (click)="changed.emit(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentControl {
  private dark = inject(Dark);
  options = input.required<{ id: string; label: string; value: unknown }[]>();
  value = input.required<unknown>();
  changed = output<unknown>();
  private light = computed(() => (this.dark.isDark() ? 60 : 20));
  protected hsla(label: string, opacity: number) {
    const dark = this.dark.isDark();
    return `hsla(${hashHue(label)}, ${dark ? 50 : 100}%, ${this.light()}%, ${opacity})`;
  }
}
