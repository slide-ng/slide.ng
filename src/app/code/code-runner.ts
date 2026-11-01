// The output area under a `{monaco-run}` editor: a run button, the result, and "show at click N".
// Port of Slidev's CodeRunner.vue. What actually runs the code is passed in as `execute`.
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { ClickInfo, ClicksContext, RawSingleAt } from '../lib/clicks';
import type { RunResult } from './monaco/run-js';
import { T } from '../i18n/t';

@Component({
  selector: 'code-runner',
  imports: [T],
  host: {
    class: 'slidev-runner relative flex flex-col rounded-b border-t border-main',
    '[class.slidev-vclick-hidden]': 'hidden()',
    '[attr.data-slide-ng-waitfor]': 'running() ? ".slidev-runner-output" : null',
  },
  templateUrl: './code-runner.html',
})
export class CodeRunner implements OnInit, OnDestroy {
  code = input.required<string>();
  /** Runs the code. `signal` is aborted when a newer run starts or the runner goes away: stop the old run then. */
  execute = input.required<(code: string, signal?: AbortSignal) => Promise<RunResult>>();
  autorun = input<boolean | 'once'>(true);
  showOutputAt = input<RawSingleAt>();
  protected running = signal(false);
  protected result = signal<RunResult | null>(null);

  private clicks = inject(ClicksContext);
  private el = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private info = signal<ClickInfo | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  protected hidden = computed(() => {
    const info = this.info();
    return this.showOutputAt() != null && info ? !info.isActive(this.clicks.current()) : false;
  });

  private ranOnce = false;
  // Numbers the runs, so an old run that ends late cannot replace a newer result.
  private runId = 0;
  private abort?: AbortController;

  constructor() {
    // `autorun: true` runs on every change (after a pause, so typing does not run on every key),
    // `'once'` runs when the code first arrives, `false` only on the button.
    effect(() => {
      const code = this.code();
      const autorun = this.autorun();
      if (!autorun || !code.trim() || (autorun === 'once' && this.ranOnce)) return;
      this.ranOnce = true;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => untracked(() => this.run()), 200);
    });
  }

  // The runner is inside the editor's component, so it registers after the slide's later clicks: tracking it lets the
  // clicks be numbered in document order (a `+1` output before a `slide-ng-click` comes first, as in Slidev).
  ngOnInit() {
    const at = this.showOutputAt();
    if (at == null) return;
    const place = () => {
      const info = this.clicks.calculate(at);
      this.info.set(info);
      this.clicks.register(this, info, { el: this.el });
    };
    place();
    this.clicks.track(this, this.el, place);
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
    this.abort?.abort();
    this.clicks.unregister(this);
  }

  protected async run() {
    const id = ++this.runId;
    // A run still going (an endless loop, say) is stopped, so the new one does not wait for its cut-off.
    this.abort?.abort();
    const abort = (this.abort = new AbortController());
    this.running.set(true);
    const result = await this.execute()(this.code(), abort.signal);
    if (id !== this.runId) return;
    this.result.set(result);
    this.running.set(false);
  }
}
