// A Mermaid diagram:  ```mermaid {theme:'neutral', scale:0.8}  or  <slide-ng-mermaid code="graph TD; A-->B" />
// Mermaid is large, so it is loaded with import() the first time a diagram is drawn.
// While the drawing is pending the host has `data-slide-ng-waitfor` (the selector that will exist when it is
// done), like Slidev's `data-waitfor`, so an exporter can wait for it.
import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { optionalNumber } from '../lib/attrs';
import { Dark } from '../lib/dark';
import { MERMAID_SETUP } from '../setup/tokens';
import { unpack } from './unpack';

let counter = 0;
let queue: Promise<unknown> = Promise.resolve(); // Mermaid draws one diagram at a time
const cache = new Map<string, string>(); // thumbnails draw the same diagram again

async function draw(code: string, config: Record<string, unknown>): Promise<string> {
  const key = JSON.stringify([code, config]);
  const known = cache.get(key);
  if (known) return known;
  const run = async () => {
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, ...config });
    const { svg } = await mermaid.render(`mermaid-${++counter}`, code);
    cache.set(key, svg);
    return svg;
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}

@Component({
  selector: 'slide-ng-mermaid',
  host: {
    class: 'block',
    '[attr.data-slide-ng-waitfor]': 'pending() ? ".mermaid > svg, .mermaid-error" : null',
  },
  template: `
    @if (error()) {
      <pre class="mermaid-error border border-red-500 rounded p-3 text-wrap">{{ error() }}</pre>
    } @else {
      <div #box class="mermaid"></div>
    }
  `,
})
export class Mermaid {
  code = input('');
  packed = input(''); // the generator packs fence text here
  scale = input<number | undefined, unknown>(undefined, { transform: optionalNumber });
  theme = input<string>();
  config = input('{}', { transform: (v: string | undefined) => v || '{}' }); // other Mermaid options, as JSON

  protected pending = signal(true);
  protected error = signal('');
  private box = viewChild<ElementRef<HTMLElement>>('box');
  private dark = inject(Dark);
  private setups = inject(MERMAID_SETUP);

  constructor() {
    effect(async () => {
      // Read every signal before the first await: only that part is watched for changes.
      const theme = this.theme() ?? (this.dark.isDark() ? 'dark' : 'default');
      const [packed, code, extra] = [this.packed(), this.code(), this.config()];
      const text = packed ? await unpack<string>(packed) : code;
      // setup/mermaid.ts of the roots come first, the diagram's own options last.
      const config = {
        theme,
        ...Object.assign({}, ...this.setups.map((f) => f())),
        ...JSON.parse(extra),
      };
      untracked(() => this.pending.set(true));
      try {
        const svg = await draw(text, config);
        this.error.set('');
        // The box only exists once the error is cleared and Angular has rendered it.
        queueMicrotask(() => this.show(svg));
      } catch (e) {
        console.warn(e);
        this.error.set(String(e));
        this.pending.set(false);
      }
    });
  }

  private show(svg: string) {
    const box = this.box()?.nativeElement;
    if (!box) return;
    box.innerHTML = svg;
    this.applyScale(box.firstElementChild as SVGElement | null);
    this.pending.set(false);
  }

  // Slidev's `scale`: the drawn height (from the viewBox) times the scale; the width follows.
  private applyScale(svg: SVGElement | null) {
    const scale = this.scale();
    const height = parseFloat(svg?.getAttribute('viewBox')?.split(' ')[3] ?? '');
    if (!svg || scale == null || isNaN(height)) return;
    svg.setAttribute('height', String(height * scale));
    svg.removeAttribute('width');
    // Never wider than the slide: a gantt chart is drawn as wide as the window, so scaling its height alone overflowed.
    svg.setAttribute('style', 'max-width: 100%');
  }
}
