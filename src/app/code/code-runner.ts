// The output area under a `{monaco-run}` editor: a run button, the result, and "show at click N".
// Port of Slidev's CodeRunner.vue. What actually runs the code is passed in as `execute`.
import {
  Component,
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
  template: `
    @if (running()) {
      <div class="text-sm text-center opacity-50">{{ 'code.running' | t }}</div>
    } @else if (!result()) {
      <div class="text-sm text-center opacity-50">{{ 'code.idle' | t }}</div>
    } @else {
      <div class="slidev-runner-output">
        @for (line of result()!.lines; track $index) {
          <div class="output-line">{{ line.join(', ') }}</div>
        }
        @if (result()!.error) {
          <div class="text-red-500">{{ result()!.error }}</div>
        }
      </div>
    }
    @if (code().trim()) {
      <button
        class="slidev-runner-run absolute right-1 top-1 w-8 h-8 flex justify-center items-center"
        [title]="'code.run' | t"
        (click)="run()"
      >
        <div class="i-carbon:play"></div>
      </button>
    }
  `,
})
export class CodeRunner implements OnInit, OnDestroy {
  code = input.required<string>();
  execute = input.required<(code: string) => Promise<RunResult>>();
  autorun = input<boolean | 'once'>(true);
  showOutputAt = input<RawSingleAt>();
  protected running = signal(false);
  protected result = signal<RunResult | null>(null);

  private clicks = inject(ClicksContext);
  private info = signal<ClickInfo | null>(null);
  private timer?: ReturnType<typeof setTimeout>;
  protected hidden = computed(() => {
    const info = this.info();
    return this.showOutputAt() != null && info ? !info.isActive(this.clicks.current()) : false;
  });

  private ranOnce = false;
  // Numbers the runs, so an old run that ends late cannot replace a newer result.
  private runId = 0;

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

  ngOnInit() {
    const at = this.showOutputAt();
    if (at != null) {
      const info = this.clicks.calculate(at);
      this.info.set(info);
      this.clicks.register(this, info);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.timer);
    this.clicks.unregister(this);
  }

  protected async run() {
    const id = ++this.runId;
    this.running.set(true);
    const result = await this.execute()(this.code());
    if (id !== this.runId) return;
    this.result.set(result);
    this.running.set(false);
  }
}
