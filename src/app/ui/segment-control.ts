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
  templateUrl: './segment-control.html',
})
export class SegmentControl {
  private dark = inject(Dark);
  /** `hue` is the name the colour is made from (default: the label). */
  options = input.required<{ id: string; label: string; hue?: string; value: unknown }[]>();
  value = input.required<unknown>();
  changed = output<unknown>();
  private light = computed(() => (this.dark.isDark() ? 60 : 20));
  protected hsla(label: string, opacity: number) {
    const dark = this.dark.isDark();
    return `hsla(${hashHue(label)}, ${dark ? 50 : 100}%, ${this.light()}%, ${opacity})`;
  }
}
