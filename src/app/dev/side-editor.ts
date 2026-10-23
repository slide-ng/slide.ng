import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Nav } from '../lib/nav';
import { T } from '../i18n/t';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { DevApi } from './dev-api';
import type { Highlight } from './editor-highlight';
import { loadHighlighter } from './load-highlighter';
import { SideEditorState, saveCaret, takeCaret } from './side-editor-state';

type Status = 'loading' | 'saved' | 'saving' | 'error' | 'conflict';
const SAVE_DELAY = 600;
// How often an open editor looks at the file for changes made elsewhere (another editor, git, the MCP server).
const WATCH_EVERY = 2000;

// The markdown of the current slide (frontmatter, content and notes) in a textarea. Like Slidev's editor, the text is coloured by Shiki
// (loaded the first time the editor opens, see editor-highlight.ts) and the textarea lies on top of the coloured copy. Typing saves it
// into slides.md through the dev server (Ctrl/Cmd+S at once); the generator rebuilds and the slide on the left updates.
@Component({
  selector: 'app-side-editor',
  imports: [T],
  template: `
    @if (state.isOpen(docked()) && state.available()) {
      <aside
        id="side-editor"
        class="flex flex-col bg-main text-main"
        [class]="
          docked() ? 'h-full w-full' : 'fixed right-0 top-0 bottom-0 z-nav border-l border-main'
        "
        [style.width.px]="docked() ? null : state.width"
      >
        <div class="flex items-center gap-2 px-3 py-1 border-b border-main text-sm">
          <span class="font-bold">{{ 'editor.slide' | t: { no: nav.no() } }}</span>
          <span
            id="editor-status"
            class="op60 ml-auto"
            [class.color-red-500]="status() === 'error' || status() === 'conflict'"
            >{{ label() }}</span
          >
          <button
            type="button"
            id="editor-close"
            class="px-1"
            [title]="'editor.close' | t"
            (click)="state.toggle(docked())"
          >
            <div class="i-carbon:close"></div>
          </button>
        </div>
        <div
          class="relative flex-auto overflow-auto"
          style="background-color: var(--slidev-code-background)"
        >
          <div class="relative min-h-full">
            <!-- This copy gives the box its height; the textarea has the same size and wraps the same way. -->
            @if (html(); as coloured) {
              <div
                id="editor-highlight"
                class="editor-text"
                aria-hidden="true"
                [innerHTML]="coloured"
              ></div>
            } @else {
              <div id="editor-sizer" class="editor-text invisible" aria-hidden="true">
                {{ text() }}
              </div>
            }
            <textarea
              #area
              id="editor-text"
              [attr.aria-label]="'editor.markdown' | t"
              spellcheck="false"
              class="editor-text absolute inset-0 w-full h-full bg-transparent outline-none resize-none overflow-hidden"
              [class.highlighted]="!!html()"
              [value]="text()"
              [disabled]="status() === 'loading'"
              (input)="edit($any($event.target).value)"
              (keydown)="keydown($event)"
              (keyup)="remember()"
              (click)="remember()"
            ></textarea>
          </div>
        </div>
      </aside>
    }
  `,
})
export class SideEditor {
  /** In a pane of the presenter page instead of fixed on the right of the deck page. */
  docked = input(false, { transform: booleanAttribute });
  protected nav = inject(Nav);
  protected state = inject(SideEditorState);
  private api = inject(DevApi);
  protected text = signal('');
  private highlight = signal<Highlight | null>(null);
  private sanitizer = inject(DomSanitizer);
  // The coloured copy of the text. Shiki escapes the text itself, so its HTML is safe to use as it is (Angular would remove its style attributes).
  protected html = computed(() => {
    const colour = this.highlight();
    return colour ? this.sanitizer.bypassSecurityTrustHtml(colour(this.text())) : null;
  });
  protected status = signal<Status>('loading');
  private timer?: ReturnType<typeof setTimeout>;
  private loadedNo = 0;
  private base = ''; // the slide's text as the file had it when it was last read or saved here
  private area = viewChild<ElementRef<HTMLTextAreaElement>>('area');
  private injector = inject(Injector);

  private dictionary = inject(UI_TEXT);
  // `conflict`: the slide changed in the file (another editor, git): the text here is kept, not written over the other change.
  protected label = () =>
    uiText(
      this.dictionary,
      (
        {
          loading: 'editor.loading',
          saved: 'editor.saved',
          saving: 'editor.saving',
          error: 'editor.error',
          conflict: 'editor.conflict',
        } as const
      )[this.status()],
    );

  constructor() {
    // Show the text of whichever slide is on screen. A change not saved yet goes out first.
    effect(() => {
      const no = this.nav.no(),
        open = this.state.isOpen(this.docked()) && this.state.available();
      if (open && no !== this.loadedNo) untracked(() => void this.load(no));
    });
    // Shiki is fetched when the editor is first opened; until it arrives the text is plain. A production build has no editor and no chunk.
    effect(() => {
      if (this.state.isOpen(this.docked()) && this.state.available() && !untracked(this.highlight))
        untracked(() => void this.loadColours());
    });
    const watch = setInterval(() => void this.refresh(), WATCH_EVERY);
    inject(DestroyRef).onDestroy(() => clearInterval(watch));
  }

  private async loadColours() {
    try {
      this.highlight.set(await loadHighlighter());
    } catch {
      /* plain text still works */
    }
  }

  protected keydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
      event.preventDefault();
      void this.flush();
    }
  }

  // Takes over a change made outside, but only when nothing typed here is waiting to be saved.
  private async refresh() {
    if (
      !this.state.isOpen(this.docked()) ||
      !this.loadedNo ||
      this.timer !== undefined ||
      this.status() !== 'saved'
    )
      return;
    const no = this.loadedNo,
      shown = this.text();
    const got = await this.api.get<{ raw: string }>(`/slides/${no}/source`);
    // The user may have typed, or moved to another slide, while we asked.
    if (
      !got ||
      this.timer !== undefined ||
      this.status() !== 'saved' ||
      this.loadedNo !== no ||
      this.text() !== shown
    )
      return;
    this.base = got.raw;
    if (got.raw !== shown) this.text.set(got.raw);
  }

  private async load(no: number) {
    await this.flush();
    this.status.set('loading');
    const got = await this.api.get<{ raw: string }>(`/slides/${no}/source`);
    if (this.nav.no() !== no) return; // moved on while waiting
    this.loadedNo = no;
    this.base = got?.raw ?? '';
    this.text.set(got?.raw ?? '');
    this.status.set(got ? 'saved' : 'error');
    // After a reload caused by typing here: the caret, the scroll position and the focus come back.
    const caret = takeCaret(no);
    if (caret)
      afterNextRender(
        () => {
          const area = this.area()?.nativeElement;
          if (!area) return;
          area.focus();
          area.setSelectionRange(caret.start, caret.end);
          area.closest('.overflow-auto')?.scrollTo({ top: caret.scroll });
        },
        { injector: this.injector },
      );
  }

  protected remember() {
    const area = this.area()?.nativeElement;
    if (area)
      saveCaret({
        no: this.loadedNo,
        start: area.selectionStart,
        end: area.selectionEnd,
        scroll: area.closest('.overflow-auto')?.scrollTop ?? 0,
      });
  }

  protected edit(value: string) {
    this.remember();
    this.text.set(value);
    this.status.set('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), SAVE_DELAY);
  }

  private async flush() {
    if (this.timer === undefined) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    const raw = this.text();
    const status = await this.api.request('PUT', `/slides/${this.loadedNo}/source`, {
      raw,
      base: this.base,
    });
    if (status === 200) this.base = raw;
    this.status.set(status === 200 ? 'saved' : status === 409 ? 'conflict' : 'error');
  }
}
