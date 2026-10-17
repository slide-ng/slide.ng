// A code block that is a real editor:  ```ts {monaco}   ```ts {monaco-diff}   ```ts {monaco-run}
// Port of Slidev's Monaco.vue. Monaco itself is loaded lazily the first time one of these is on screen.
import {
  Component,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { Dark } from '../lib/dark';
import { Disposables } from '../lib/disposables';
import { CodeRunner } from './code-runner';
import { MONACO_SETUP } from '../setup/tokens';
import { runJs } from './monaco/run-js';
import { CODE_RUNNERS } from './runners';
import { unpack } from './unpack';
import type * as Monaco from 'monaco-editor';

const LANGUAGES: Record<string, string> = { ts: 'typescript', js: 'javascript' };
const EXTENSIONS: Record<string, string> = { typescript: 'mts', javascript: 'mjs' };
let modelCounter = 0;

// `autorun` is true, false or the text "once".
const toAutorun = (v: unknown): boolean | 'once' =>
  v === 'once' ? 'once' : !(v === false || v === 'false');

@Component({
  selector: 'slide-ng-monaco',
  imports: [CodeRunner],
  // The host has `data-slide-ng-waitfor` until Monaco is loaded and the editor exists, so an exporter can wait.
  host: {
    class: 'relative slidev-monaco-container block',
    '[attr.data-slide-ng-waitfor]': 'loaded() ? null : ".monaco-editor"',
  },
  template: `
    <div class="relative slidev-monaco-container-inner" [style.height]="height()">
      <div #box class="absolute inset-0.5"></div>
    </div>
    @if (runnable()) {
      <code-runner
        [code]="code()"
        [execute]="execute"
        [autorun]="autorun()"
        [showOutputAt]="showOutputAt()"
      />
    }
  `,
})
export class MonacoEditor {
  lang = input('typescript');
  code0 = input('', { alias: 'code' }); // plain text, for direct use
  packed = input(''); // the generator packs the text here
  diff = input(''); // packed text of the modified side of `{monaco-diff}`
  readonly = input(false, { transform: booleanAttribute });
  lines = input(false, { transform: booleanAttribute });
  /** 'initial' = as tall as the first text, 'auto' = grows with the text, or any CSS size */
  heightOption = input('initial', { alias: 'height' });
  runnable = input(false, { transform: booleanAttribute });
  autorun = input<boolean | 'once', unknown>(true, { transform: toAutorun });
  showOutputAt = input<string>();
  /** `{monaco-write}`: the id the dev server knows the file by. Edits are saved through it. */
  writeId = input('', { alias: 'write-id' });

  /** The current text of the editor; the runner watches it. */
  protected code = signal('');
  private box = viewChild.required<ElementRef<HTMLElement>>('box');
  private dark = inject(Dark);
  private api = inject(DevApi);
  private writeTimer?: ReturnType<typeof setTimeout>;
  protected loaded = signal(false);
  private contentHeight = signal(0);
  private firstHeight = signal(0);
  private monaco?: typeof Monaco;
  private model?: Monaco.editor.ITextModel;
  private disposables = new Disposables();
  private ready: Promise<void>;
  private markReady!: () => void;
  private setups = inject(MONACO_SETUP);

  protected height = computed(() => {
    const h = this.heightOption();
    if (h === 'auto') return `${this.contentHeight()}px`;
    if (h === 'initial') return `${this.firstHeight()}px`;
    return h;
  });

  constructor() {
    this.ready = new Promise((resolve) => (this.markReady = resolve));
    afterNextRender(() => void this.start());
    inject(DestroyRef).onDestroy(() => this.disposables.disposeAll());
    // Read the mode first: before Monaco loads the call below is skipped, and an effect that read nothing never runs again.
    effect(() => {
      const theme = this.dark.isDark() ? 'vs-dark' : 'vs';
      this.monaco?.editor.setTheme(theme);
    });
  }

  private async start() {
    const text = (this.packed() ? await unpack<string>(this.packed()) : this.code0()).trimEnd();
    const modified = this.diff() ? (await unpack<string>(this.diff())).trimEnd() : null;
    let monaco: typeof Monaco;
    try {
      ({ monaco } = await import('./monaco/setup'));
    } catch (e) {
      console.error('slide.ng: Monaco could not be loaded', e);
      this.loaded.set(true); // stop an exporter from waiting for an editor that will not come
      return;
    }
    if (this.disposables.isDisposed) return; // the slide was left while Monaco loaded
    this.monaco = monaco;
    // setup/monaco.ts of the roots: they get `monaco`, and the options they return apply to every editor.
    const fromSetup: Monaco.editor.IStandaloneEditorConstructionOptions = {};
    for (const setup of this.setups) Object.assign(fromSetup, await setup(monaco));
    if (this.disposables.isDisposed) return;
    const lang = LANGUAGES[this.lang()] ?? this.lang();
    const ext = EXTENSIONS[lang] ?? lang;
    const newModel = (value: string) =>
      this.disposables.add(
        monaco.editor.createModel(
          value,
          lang,
          monaco.Uri.parse(`file:///model-${++modelCounter}.${ext}`),
        ),
      );

    const model = (this.model = newModel(text));
    this.code.set(text);
    const base = {
      automaticLayout: true,
      readOnly: this.readonly(),
      lineNumbers: this.lines() ? 'on' : 'off',
      minimap: { enabled: false },
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      padding: { top: 10, bottom: 10 },
      lineNumbersMinChars: 3,
      bracketPairColorization: { enabled: false },
      tabSize: 2,
      fontSize: 11.5,
      fontFamily: 'var(--slidev-code-font-family)',
      scrollBeyondLastLine: false,
      useInlineViewWhenSpaceIsLimited: false,
      theme: this.dark.isDark() ? 'vs-dark' : 'vs',
    } as const;
    const options: Monaco.editor.IStandaloneEditorConstructionOptions = { ...base, ...fromSetup };

    const grow = (height: number) => {
      this.firstHeight.update((h) => h || height);
      this.contentHeight.set(height);
    };
    if (modified != null) {
      // The model first: disposal runs backwards, and the editor must let go of its models before they go.
      const changed = newModel(modified);
      const editor = this.disposables.add(
        monaco.editor.createDiffEditor(this.box().nativeElement, {
          renderOverviewRuler: false,
          ...options,
        }),
      );
      editor.setModel({ original: model, modified: changed });
      const [a, b] = [editor.getOriginalEditor(), editor.getModifiedEditor()];
      const resize = () => grow(Math.max(a.getContentHeight(), b.getContentHeight()) + 4);
      a.onDidContentSizeChange(resize);
      b.onDidContentSizeChange(resize);
      changed.onDidChangeContent(() => this.code.set(changed.getValue()));
    } else {
      const editor = this.disposables.add(
        monaco.editor.create(this.box().nativeElement, {
          model,
          lineDecorationsWidth: 0,
          ...options,
        }),
      );
      editor.onDidContentSizeChange((e) => grow(e.contentHeight + 4));
    }
    model.onDidChangeContent(() => {
      if (modified != null) return;
      this.code.set(model.getValue());
      this.saveToFile(model.getValue());
    });
    this.loaded.set(true);
    this.markReady();
  }

  // `{monaco-write}`: write the text to its file once the typing pauses (dev server only).
  private saveToFile(text: string) {
    const id = this.writeId();
    if (!id) return;
    clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(
      () => void this.api.send('PUT', `/monaco/${id}`, { content: text }),
      600,
    );
  }

  // Runs the editor's text: TypeScript is turned into JavaScript by Monaco's own TypeScript worker.
  private runners = Object.assign({}, ...(inject(CODE_RUNNERS, { optional: true }) ?? []));

  protected execute = async (code: string) => {
    await this.ready;
    // A runner from a theme replaces the built-in one for its language.
    const custom = this.runners[this.model?.getLanguageId() ?? ''];
    if (custom) return custom(code);
    let js = code;
    if (this.model && this.model.getLanguageId() === 'typescript') {
      const worker = await this.monaco!.typescript.getTypeScriptWorker();
      const client = await worker(this.model.uri);
      const out = await client.getEmitOutput(this.model.uri.toString());
      js =
        out.outputFiles.find((f) => f.name.endsWith('.js') || f.name.endsWith('.mjs'))?.text ??
        code;
    }
    return runJs(js.replace('export {};', ''));
  };
}
