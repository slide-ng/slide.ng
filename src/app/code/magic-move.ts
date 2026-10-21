// Code that morphs from one step to the next as you click: ````md magic-move
// Port of Slidev's ShikiMagicMove.vue. The steps were tokenised while generating; the animation
// is @shikijs/magic-move's own renderer, loaded only when a deck uses this component.
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
  viewChild,
  effect,
  booleanAttribute,
} from '@angular/core';
import type {
  KeyedTokensInfo,
  MagicMoveDifferOptions,
  MagicMoveRenderOptions,
} from '@shikijs/magic-move/types';
import { CLICKS_MAX, ClickInfo, ClicksContext, RawSingleAt } from '../lib/clicks';
import { T } from '../i18n/t';
import { copyText } from './copy';
import { highlightLines } from './ranges';
import { unpack } from './unpack';

// Which step and which line range are shown at this click.
export function stepAt(ranges: string[][], clickCount: number, stepCount: number) {
  let sum = 0;
  for (let i = 0; i < ranges.length; i++) {
    const own = ranges[i];
    if (clickCount < sum + own.length - 1) return { step: i, range: own[clickCount - sum + 1] };
    sum += own.length || 1;
  }
  return { step: stepCount - 1, range: 'all' };
}

type MagicMoveOptions = MagicMoveRenderOptions & MagicMoveDifferOptions;

@Component({
  selector: 'slide-ng-magic-move',
  imports: [T],
  // While the animation code and the steps load, the host has `data-slide-ng-waitfor` (like the Mermaid block), so an exporter can wait.
  host: {
    class: 'slidev-code-wrapper slidev-code-magic-move relative group',
    '[attr.data-slide-ng-waitfor]': 'data() ? null : ".shiki-magic-move-container span"',
  },
  template: `
    @if (title()) {
      <div class="slidev-code-block-title">
        <div class="leading-1em">{{ title() }}</div>
      </div>
    }
    <pre #pre class="slidev-code relative shiki shiki-magic-move-container overflow-visible"></pre>
    @if (!noCopy()) {
      <button
        class="slidev-code-copy absolute right-0 transition opacity-0 group-hover:opacity-20 hover:!opacity-100"
        [class]="title() ? 'top-10' : 'top-0'"
        [attr.title]="(copied() ? 'code.copied' : 'code.copy') | t"
        (click)="copy()"
      >
        <span
          [class]="copied() ? 'i-ph:check-circle' : 'i-ph:clipboard'"
          class="inline-block p-2 w-8 h-8"
        ></span>
      </button>
    }
  `,
})
export class ShikiMagicMove implements OnInit, OnDestroy {
  steps = input.required<string>(); // packed by the generator
  stepRanges = input([], { transform: (v: string) => JSON.parse(v || '[]') as string[][] });
  at = input<RawSingleAt>('+1');
  title = input('');
  duration = input(800, { transform: numberAttribute });
  noCopy = input(false, { transform: booleanAttribute });
  // The headmatter's `shiki.magicMove`, as JSON: render options and the differ's `splitTokens` / `enhanceMatching`.
  options = input({} as MagicMoveOptions, {
    transform: (v: string) => JSON.parse(v || '{}') as MagicMoveOptions,
  });

  protected copied = signal(false);
  private clicks = inject(ClicksContext);
  private pre = viewChild.required<ElementRef<HTMLElement>>('pre');
  private host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private info = signal<ClickInfo | null>(null);
  private data = signal<KeyedTokensInfo[] | null>(null);
  // At least one range per step, so a step without ranges is shown whole.
  private ranges = computed(() => this.stepRanges().map((r) => (r.length ? r : ['all'])));
  private where = computed(() => {
    const info = this.info();
    const count = info ? this.clicks.current() - info.start : CLICKS_MAX;
    return stepAt(this.ranges(), count, this.ranges().length);
  });

  private renderer?: InstanceType<typeof import('@shikijs/magic-move/renderer').MagicMoveRenderer>;
  private sync?: typeof import('@shikijs/magic-move/core').syncTokenKeys;
  private previous?: KeyedTokensInfo;
  private shownStep = -1;
  private alive = true;

  constructor() {
    // Whenever the click, or the data arriving, changes what should be shown.
    effect(() => {
      const steps = this.data();
      const { step, range } = this.where();
      if (steps) this.show(steps, step, range);
    });
  }

  // In template order, so that "+1" counts the elements before this one.
  ngOnInit() {
    const total = this.ranges().reduce((sum, r) => sum + r.length, 0);
    const place = () => {
      const info = this.clicks.calculateSince(this.at(), total - 1);
      this.info.set(info);
      this.clicks.register(this, info);
    };
    place();
    this.clicks.track(this, this.host, place);
    // Load the animation code and the steps; neither is needed before this.
    void Promise.all([
      import('@shikijs/magic-move/renderer'),
      import('@shikijs/magic-move/core'),
      unpack<KeyedTokensInfo[]>(this.steps()),
    ]).then(([renderer, core, steps]) => {
      if (!this.alive) return;
      this.sync = core.syncTokenKeys;
      this.renderer = new renderer.MagicMoveRenderer(this.pre().nativeElement);
      this.data.set(steps);
    });
  }

  ngOnDestroy() {
    this.alive = false;
    this.clicks.unregister(this);
  }

  private show(steps: KeyedTokensInfo[], step: number, range: string) {
    const renderer = this.renderer!;
    if (step !== this.shownStep) {
      const first = this.shownStep < 0;
      const next = steps[step];
      const { from, to } = this.sync!(this.previous ?? steps[step], next, this.options());
      // The canvas is scaled with CSS; the renderer needs to know to place the tokens.
      const box = this.host.getBoundingClientRect();
      // Slidev's order: a stagger of 1 ms, the deck's options, then the scale and the duration.
      Object.assign(renderer.options, { stagger: 1, ...this.options() });
      renderer.options.globalScale = box.width / (this.host.offsetWidth || 1);
      renderer.options.duration = first ? 0 : this.duration();
      this.shownStep = step;
      this.previous = to;
      if (first) renderer.replace(to);
      else {
        renderer.replace(from);
        void renderer.render(to);
      } // the animation runs on its own
    }
    this.highlight(range);
  }

  // Group the rendered tokens into lines at the <br> elements, then highlight like a code block.
  private highlight(range: string) {
    const tokens = Array.from(this.pre().nativeElement.children)
      .slice(1) // the first child is the renderer's anchor
      .filter((el) => !el.className.includes('shiki-magic-move-leave'));
    const lines: Element[][] = [[]];
    for (const el of tokens) {
      if (el.tagName === 'BR') lines.push([]);
      else lines[lines.length - 1].push(el);
    }
    highlightLines(lines, range, 1);
  }

  protected async copy() {
    const step = this.data()?.[this.where().step];
    if (!step || !(await copyText(step.code.trim()))) return;
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
}
