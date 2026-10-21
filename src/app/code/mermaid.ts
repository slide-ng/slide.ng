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
import {
  MERMAID_RENDERER,
  MERMAID_SETUP,
  MermaidRenderer,
  MermaidRendererSetup,
} from '../setup/tokens';
import { unpack } from './unpack';

let counter = 0;
let queue: Promise<unknown> = Promise.resolve(); // Mermaid draws one diagram at a time
const cache = new Map<string, string>(); // thumbnails draw the same diagram again

async function draw(
  code: string,
  config: Record<string, unknown>,
  renderer: MermaidRenderer | null,
): Promise<string> {
  const key = JSON.stringify([code, config]);
  const known = cache.get(key);
  if (known) return known;
  const run = async () => {
    if (renderer) {
      const svg: unknown = await renderer(code, config);
      // A renderer that resolves to nothing would draw "undefined": show the error box, as for one that throws.
      if (typeof svg !== 'string') {
        throw new Error(
          `setup/mermaid-renderer.ts: the renderer must resolve to an SVG string, it gave ${String(svg)}`,
        );
      }
      cache.set(key, svg);
      return svg;
    }
    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({ startOnLoad: false, ...config });
    const id = `mermaid-${++counter}`;
    try {
      const { svg } = await mermaid.render(id, code);
      cache.set(key, svg);
      return svg;
    } finally {
      // After a syntax error Mermaid leaves its error drawing in <body>; on paper it became an extra page.
      document.getElementById(`d${id}`)?.remove();
    }
  };
  const result = queue.then(run);
  queue = result.catch(() => undefined);
  return result;
}

// setup/mermaid-renderer.ts: the last root whose function gives a renderer wins; each list is asked once.
// A file that throws is skipped (the next root, then Mermaid itself) and asked again for the next diagram.
const renderers = new WeakMap<MermaidRendererSetup[], Promise<MermaidRenderer | null>>();
export function findRenderer(setups: MermaidRendererSetup[]): Promise<MermaidRenderer | null> {
  let found = renderers.get(setups);
  if (!found) {
    let failed = false;
    found = (async () => {
      for (const setup of setups.slice().reverse()) {
        try {
          const renderer = await setup();
          if (renderer) return renderer;
        } catch (e) {
          console.warn(e);
          failed = true;
        }
      }
      return null;
    })();
    renderers.set(setups, found);
    void found.then(() => failed && renderers.delete(setups));
  }
  return found;
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
  /** The drawn SVG; a new object for every drawing, so drawing the same SVG again still shows it. */
  private drawn = signal<{ svg: string } | null>(null);
  private box = viewChild<ElementRef<HTMLElement>>('box');
  private dark = inject(Dark);
  private setups = inject(MERMAID_SETUP);
  private rendererSetups = inject(MERMAID_RENDERER);

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
        const svg = await draw(text, config, await findRenderer(this.rendererSetups));
        this.error.set('');
        this.drawn.set({ svg });
      } catch (e) {
        console.warn(e);
        this.drawn.set(null);
        this.error.set(String(e));
        this.pending.set(false);
      }
    });
    // The box only exists once the error is cleared and Angular has rendered it (after a failed drawing too):
    // the SVG goes in when both are there.
    effect(() => {
      const box = this.box()?.nativeElement;
      const drawn = this.drawn();
      if (!box || !drawn) return;
      box.innerHTML = drawn.svg;
      untracked(() => this.applyScale(box.firstElementChild as SVGElement | null));
      this.pending.set(false);
    });
  }

  // Slidev's `scale`: the drawn height (from the viewBox) times the scale; the width follows.
  private applyScale(svg: SVGElement | null) {
    const scale = this.scale();
    const height = parseFloat(svg?.getAttribute('viewBox')?.split(' ')[3] ?? '');
    if (!svg || scale == null || isNaN(height)) return;
    const width = parseFloat(svg.getAttribute('viewBox')?.split(' ')[2] ?? '');
    svg.setAttribute('height', String(height * scale));
    if (isNaN(width)) svg.removeAttribute('width');
    else svg.setAttribute('width', String(width * scale));
    // Never wider than the slide (a gantt chart is drawn as wide as the window); the height follows the width then.
    svg.setAttribute('style', 'max-width: 100%; height: auto');
  }
}
