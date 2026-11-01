import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DevApi } from '../dev/dev-api';
import { noteOf, withNote } from '../dev/note-source';
import { saveCaret, takeCaret } from '../dev/side-editor-state';
import { T } from '../i18n/t';

type Status = 'loading' | 'saved' | 'saving' | 'error' | 'conflict';
const SAVE_DELAY = 500; // Slidev's NoteEditable waits as long

// The presenter's notes as a text box (Slidev's NoteEditable), dev server only. It reads the slide's markdown, shows its
// note, and writes only the note part back (debounced; Ctrl/Cmd+S at once). Escape or a click outside ends editing.
// The note is part of the generated deck, so a save rebuilds it and reloads the page: the caret comes back afterwards.
@Component({
  selector: 'app-note-editor',
  imports: [T],
  host: { class: 'flex flex-col h-full', '(document:pointerdown)': 'outside($event)' },
  templateUrl: './note-editor.html',
})
export class NoteEditor {
  no = input.required<number>();
  /** Editing should end (Escape, or a click outside the box). */
  done = output<void>();

  private api = inject(DevApi);
  private el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private injector = inject(Injector);
  private area = viewChild<ElementRef<HTMLTextAreaElement>>('area');
  protected text = signal('');
  protected status = signal<Status>('loading');
  /** The slide's markdown arrived; without it nothing may be written (the note would replace the whole slide). */
  protected loaded = signal(false);
  private base = ''; // the slide's markdown as it was last read or saved here
  private loadedNo = 0;
  private timer?: ReturnType<typeof setTimeout>;

  protected label = () =>
    (
      ({
        loading: 'editor.loading',
        saved: 'editor.saved',
        saving: 'editor.saving',
        error: 'editor.error',
        conflict: 'noteEditor.conflict',
      }) as const
    )[this.status()];

  constructor() {
    effect(() => {
      const no = this.no();
      untracked(() => void this.load(no));
    });
    // Leaving the slide or closing the editor saves what is waiting.
    inject(DestroyRef).onDestroy(() => void this.flush());
  }

  private async load(no: number) {
    await this.flush();
    this.status.set('loading');
    this.loaded.set(false);
    const got = await this.api.get<{ raw: string }>(`/slides/${no}/source`);
    if (this.no() !== no) return;
    this.loadedNo = no;
    this.base = got?.raw ?? '';
    this.text.set(noteOf(this.base));
    this.loaded.set(!!got);
    this.status.set(got ? 'saved' : 'error');
    afterNextRender(
      () => {
        const area = this.area()?.nativeElement;
        if (!area) return;
        area.focus();
        const caret = takeCaret(no, 'note');
        if (caret) {
          area.setSelectionRange(caret.start, caret.end);
          area.scrollTop = caret.scroll;
        }
      },
      { injector: this.injector },
    );
  }

  protected remember() {
    const area = this.area()?.nativeElement;
    if (area && this.loadedNo)
      saveCaret({
        no: this.loadedNo,
        field: 'note',
        start: area.selectionStart,
        end: area.selectionEnd,
        scroll: area.scrollTop,
      });
  }

  protected edit(value: string) {
    this.remember();
    this.text.set(value);
    this.status.set('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), SAVE_DELAY);
  }

  protected keydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
      e.preventDefault();
      void this.flush();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.done.emit();
    }
  }

  protected outside(e: PointerEvent) {
    const target = e.target as Element | null;
    // The toggle button handles itself; anything else outside the box ends editing (Slidev's onClickOutside).
    if (target && !this.el.contains(target) && !target.closest?.('#notes-edit')) this.done.emit();
  }

  private async flush() {
    if (this.timer === undefined || !this.loaded()) return;
    clearTimeout(this.timer);
    this.timer = undefined;
    const raw = withNote(this.base, this.text());
    if (raw === this.base) {
      this.status.set('saved');
      return;
    }
    const status = await this.api.request('PUT', `/slides/${this.loadedNo}/source`, {
      raw,
      base: this.base,
    });
    if (status === 200) this.base = raw;
    this.status.set(status === 200 ? 'saved' : status === 409 ? 'conflict' : 'error');
  }
}
