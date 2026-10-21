import {
  Component,
  Injector,
  booleanAttribute,
  computed,
  inject,
  input,
  numberAttribute,
} from '@angular/core';
import { EN, UiText } from '../i18n/en';
import { UI_TEXT } from '../i18n/ui-text';
import { ClicksContext } from '../lib/clicks';
import { Nav } from '../lib/nav';
import { LAYER_STEP, SLIDE_NO } from '../lib/slide-context';
import { Timer } from '../presenter/timer';

// <slide-ng-progress-bar />: a thin bar along the edge of the slide that shows how far through the deck we are,
// optionally with the minutes of the presenter timer. The headmatter `progressBar` draws one on every slide
// (deck-progress-bar.ts); a slide or a layer can place its own.

/** How far through the deck slide `no` at click `clicks` is, 0 to 100. The first slide is 0, the last is 100;
 *  the clicks of a slide fill the way to the next one (as the presenter's bar does). */
export function progressPercent(
  no: number,
  total: number,
  clicks: number,
  clicksTotal: number,
): number {
  if (total <= 1 || no >= total) return 100;
  const step = clicksTotal > 0 ? Math.min(Math.max(clicks, 0), clicksTotal) / (clicksTotal + 1) : 0;
  return ((Math.max(no, 1) - 1 + step) / (total - 1)) * 100;
}

/** The words of the minutes text, `{n}` the number of minutes. */
export interface MinutesText {
  passed: string;
  left: string;
  over: string;
}

/** The minutes words of an interface dictionary (the deck's `uiLang`; English by default, see docs/UI-STRINGS.md). */
export function minutesText(dictionary: UiText = EN): MinutesText {
  return {
    passed: dictionary['progress.minutes'],
    left: dictionary['progress.minutesLeft'],
    over: dictionary['progress.minutesOver'],
  };
}

/** The minutes text: what is left of a countdown (or how far over it is), or the minutes passed on a stopwatch. */
export function minutesLabel(
  mode: 'stopwatch' | 'countdown',
  durationSec: number,
  passedSec: number,
  text: MinutesText = minutesText(),
): string {
  const say = (key: keyof MinutesText, n: number) => text[key].replace('{n}', String(n));
  if (mode === 'stopwatch') return say('passed', Math.floor(passedSec / 60));
  const left = durationSec - passedSec;
  return left >= 0 ? say('left', Math.ceil(left / 60)) : say('over', Math.ceil(-left / 60));
}

@Component({
  selector: 'slide-ng-progress-bar',
  host: {
    class: 'slide-ng-progress-bar',
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-valuenow]': 'percent()',
    '[style]': 'hostStyle()',
  },
  template: `
    <div
      class="slide-ng-progress-fill transition-all duration-300"
      [style.width.%]="percent()"
      [style.height.%]="100"
      [style.background]="color() || 'var(--slidev-theme-primary)'"
    ></div>
    @if (minutesText(); as text) {
      <span
        class="slide-ng-progress-minutes absolute right-2 text-xs op75"
        [style.top]="position() === 'top' ? '100%' : null"
        [style.bottom]="position() === 'top' ? null : '100%'"
        >{{ text }}</span
      >
    }
  `,
})
export class SlideProgressBar {
  /** `bottom` or `top` sits on that edge of the slide; `inline` stays where it is written. */
  position = input<'top' | 'bottom' | 'inline'>('bottom');
  /** Thickness in slide pixels. */
  height = input(4, { transform: numberAttribute });
  /** Colour of the filled part (any CSS colour); the theme's primary colour when empty. */
  color = input('');
  /** Colour of the empty part. */
  track = input('transparent');
  /** Count the clicks of a slide, not only whole slides. */
  clicks = input(true, { transform: booleanAttribute });
  /** Show the minutes of the presenter timer while it runs (left of a countdown, passed on a stopwatch). */
  minutes = input(false, { transform: booleanAttribute });
  /** The slide to show progress for; the slide this bar is on when not given. */
  no = input<number | undefined, unknown>(undefined, {
    transform: (v: unknown) => (v == null || v === '' ? undefined : numberAttribute(v)),
  });
  /** The click to show, with the slide's number of clicks; read from the slide when not given. */
  at = input<{ current: number; total: number } | null>(null);

  private slideNo = inject(SLIDE_NO);
  private slideClicks = inject(ClicksContext, { optional: true });
  private layerStep = inject(LAYER_STEP, { optional: true });
  private nav = inject(Nav, { optional: true });
  private injector = inject(Injector);
  private words = minutesText(inject(UI_TEXT));
  private total = this.nav?.total ?? 1;

  private step = computed(() => {
    const at = this.at();
    if (at) return at;
    // Inside a slide (or a slide layer) the slide's own clicks; in a global layer those of the slide on screen.
    if (this.slideClicks)
      return { current: this.slideClicks.current(), total: this.slideClicks.total() };
    // In a global layer of a print page or the next-step preview, the click of that frame.
    const layer = this.layerStep?.();
    if (layer && this.current() === this.slideNo) return layer;
    if (this.nav && this.nav.no() === this.current())
      return { current: this.nav.clicks(), total: this.nav.clicksTotal() };
    return { current: 0, total: 0 };
  });
  private current = computed(() => this.no() ?? this.slideNo);
  protected percent = computed(() => {
    const step = this.clicks() ? this.step() : { current: 0, total: 0 };
    return (
      Math.round(progressPercent(this.current(), this.total, step.current, step.total) * 100) / 100
    );
  });

  // The timer is only created when the minutes are wanted (it joins the window sync).
  private timer = computed(() => (this.minutes() ? this.injector.get(Timer) : null));
  protected minutesText = computed(() => {
    const timer = this.timer();
    if (!timer || timer.status() === 'stopped') return '';
    return minutesLabel(timer.mode, timer.duration, timer.passed(), this.words);
  });

  protected hostStyle = computed(() => {
    const edge = this.position();
    const placed =
      edge === 'inline'
        ? { position: 'relative', width: '100%' }
        : { position: 'absolute', left: '0', right: '0', [edge]: '0', 'z-index': '10' };
    return {
      ...placed,
      display: 'block',
      height: `${this.height()}px`,
      background: this.track(),
      'pointer-events': 'none',
    };
  });
}
