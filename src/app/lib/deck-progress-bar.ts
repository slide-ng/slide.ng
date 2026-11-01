import { Component, input } from '@angular/core';
import { HEADMATTER } from '../../slides/generated';
import { SlideProgressBar } from '../builtin/progress-bar';

// The headmatter `progressBar`: one <slide-ng-progress-bar> over every slide (deck, presenter, next step and print).

export interface ProgressBarOptions {
  position: 'top' | 'bottom';
  height: number;
  color: string;
  track: string;
  clicks: boolean;
  minutes: boolean;
}

/**
 * `progressBar: true`, `top`, `bottom` (short for `{ position: top }`) or `{ position, height, color, track, clicks,
 * minutes }` -> the options; anything else -> null (the generator warns about it, see parse-deck.mjs).
 */
export function readProgressBar(value: unknown): ProgressBarOptions | null {
  if (value === 'top' || value === 'bottom') value = { position: value };
  if (value !== true && (typeof value !== 'object' || value === null || Array.isArray(value)))
    return null;
  const o = (value === true ? {} : value) as Record<string, unknown>;
  const height = Number(o['height']);
  return {
    position: o['position'] === 'top' ? 'top' : 'bottom',
    height: Number.isFinite(height) && height > 0 ? height : 4,
    color: typeof o['color'] === 'string' ? o['color'] : '',
    track: typeof o['track'] === 'string' ? o['track'] : 'transparent',
    clicks: o['clicks'] !== false,
    minutes: o['minutes'] === true,
  };
}

const OPTIONS = readProgressBar(HEADMATTER['progressBar']);

@Component({
  selector: 'app-deck-progress-bar',
  imports: [SlideProgressBar],
  host: { style: 'display: contents' },
  templateUrl: './deck-progress-bar.html',
})
export class DeckProgressBar {
  /** The slide drawn under the bar. */
  no = input.required<number>();
  /** Its click, when the caller knows it better than the slide on screen (print pages, the next step). */
  at = input<{ current: number; total: number } | null>(null);
  protected options = OPTIONS;
}
