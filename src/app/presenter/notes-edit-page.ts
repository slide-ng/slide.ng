import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { Dark } from '../lib/dark';
import { NoteStore } from './note-store';
import { notesToText, textToNotes } from './notes-text';
import { T } from '../i18n/t';
import type { UiTextKey } from '../i18n/en';

type Status =
  'loading' | 'saved' | 'saving' | 'invalid' | 'conflict' | 'outside' | 'error' | 'offline';
const SAVE_DELAY = 600;
// A saved note rebuilds the deck and reloads this page. What was typed meanwhile is kept for a moment and taken back.
const DRAFT = 'slide-ng-notes-draft';
// The keys typed while the page was starting again, kept by src/index.html.
const EARLY_KEYS = 'slide-ng-notes-keys';
const FRESH_MS = 15_000;
interface Draft {
  text: string;
  start: number;
  end: number;
  at: number;
}

// The route /notes-edit (Slidev's notes editor, dev only): every note in one text, after `--- #N` lines. What is typed is saved
// into the markdown files after a short pause, only the notes that changed. A text whose markers changed is not saved.
@Component({
  selector: 'app-notes-edit-page',
  imports: [RouterLink, T],
  host: { class: 'flex flex-col h-full bg-main text-main' },
  template: `
    <header class="flex items-center gap-4 px-6 py-3 border-b border-main">
      <h1 class="text-lg">{{ 'notesEdit.heading' | t }}</h1>
      <span id="notes-edit-status" class="text-sm op60" [attr.data-status]="status()">{{
        statusText[status()] | t: { count: slideCount }
      }}</span>
      <div class="flex-auto"></div>
      <a routerLink="/entry" class="text-sm op75 hover:op100">{{ 'pages.all' | t }}</a>
    </header>
    <textarea
      #area
      id="notes-edit-text"
      class="flex-auto w-full p-6 font-mono text-sm bg-transparent outline-none resize-none"
      style="unicode-bidi: plaintext"
      spellcheck="false"
      [attr.aria-label]="'notesEdit.label' | t"
      [disabled]="(status() === 'loading' && !draft) || status() === 'offline'"
      [value]="text()"
      (input)="edit($any($event.target).value)"
    ></textarea>
  `,
})
export class NotesEditPage {
  private store = inject(NoteStore);
  private injector = inject(Injector);
  private area = viewChild<ElementRef<HTMLTextAreaElement>>('area');
  protected text = signal('');
  protected status = signal<Status>('loading');
  protected readonly slideCount = SLIDES.length;
  protected readonly statusText: Record<Status, UiTextKey> = {
    loading: 'editor.loading',
    saved: 'editor.saved',
    saving: 'editor.saving',
    invalid: 'notesEdit.invalid',
    conflict: 'notesEdit.conflict',
    outside: 'notesEdit.outside',
    error: 'notesEdit.error',
    offline: 'notesEdit.offline',
  };
  /** The notes as the files have them, as far as this page knows. */
  private saved: (string | null)[] = [];
  private timer?: ReturnType<typeof setTimeout>;
  private edits = 0; // counts what was typed, so a save that ends after more typing does not say "Saved"
  private saving = Promise.resolve();
  /** What was typed before the reload, when this page came back after one. */
  protected readonly draft = takeDraft();

  constructor() {
    inject(Dark);
    inject(Title).setTitle(`Notes editor - ${HEADMATTER['title'] ?? 'slide.ng'}`);
    // Back after a reload: the text, the caret and the focus return at once, before the notes are read, so the keys typed
    // while they load land in the text too.
    const draft = this.draft;
    if (draft) {
      this.text.set(draft.text);
      afterNextRender(
        () => {
          const area = this.area()?.nativeElement;
          area?.focus();
          area?.setSelectionRange(draft.start, draft.end);
          // The keys typed while the page was starting (index.html kept them): typed into the text now.
          const early = takeEarlyKeys();
          if (area && early.length) {
            const typed = typeKeys(draft.text, draft.start, draft.end, early);
            area.value = typed.text;
            area.setSelectionRange(typed.caret, typed.caret);
            this.edit(typed.text); // the draft has them now
          }
        },
        { injector: this.injector },
      );
    } else takeEarlyKeys(); // no draft to type them into: stop keeping keys
    void this.load();
  }

  private async load() {
    const notes = await this.store.load();
    if (!notes) return this.status.set('offline');
    this.saved = notes;
    this.status.set('saved');
    if (!this.draft) return this.text.set(notesToText(notes.map((n) => n ?? '')));
    // What was not saved before the reload, and what was typed since, is saved now.
    this.edit(this.text());
  }

  protected edit(value: string) {
    this.edits++;
    this.text.set(value);
    const area = this.area()?.nativeElement;
    keepDraft({
      text: value,
      start: area?.selectionStart ?? 0,
      end: area?.selectionEnd ?? 0,
      at: Date.now(),
    });
    if (this.status() === 'loading') return; // saved once the notes are read (load)
    clearTimeout(this.timer);
    if (!Array.isArray(textToNotes(value, SLIDES.length))) return this.status.set('invalid');
    this.status.set('saving');
    this.timer = setTimeout(() => (this.saving = this.saving.then(() => this.save())), SAVE_DELAY);
  }

  // One request per changed note, one after the other; a note outside the project's files is never written.
  private async save() {
    const edits = this.edits;
    const notes = textToNotes(this.text(), SLIDES.length);
    if (!Array.isArray(notes)) return this.status.set('invalid');
    let outside = false;
    for (const [i, note] of notes.entries()) {
      const base = this.saved[i];
      // Shown empty, and never written: typing there must not end in "Saved".
      if (base == null) outside ||= note !== '';
      if (base == null || note === base) continue;
      const status = await this.store.save(i + 1, note, base);
      if (status !== 200) return this.status.set(status === 409 ? 'conflict' : 'error');
      this.saved[i] = note;
    }
    if (edits === this.edits) this.status.set(outside ? 'outside' : 'saved');
  }
}

/** A key that index.html kept while the page was starting; `ctrl` is any of Ctrl, Meta and Alt (a shortcut, not text). */
export interface EarlyKey {
  key: string;
  ctrl: boolean;
}
/** `text` after typing `keys` with the selection at `start`-`end`: letters, Enter, Backspace and Delete; other keys are skipped. */
export function typeKeys(
  text: string,
  start: number,
  end: number,
  keys: readonly EarlyKey[],
): { text: string; caret: number } {
  for (const { key, ctrl } of keys) {
    if (ctrl) continue;
    const insert = key === 'Enter' ? '\n' : [...key].length === 1 ? key : null;
    if (insert === null && key !== 'Backspace' && key !== 'Delete') continue;
    if (start === end && insert === null) {
      if (key === 'Backspace') start = Math.max(0, start - 1);
      else end = Math.min(text.length, end + 1);
    }
    text = text.slice(0, start) + (insert ?? '') + text.slice(end);
    start = end = start + (insert?.length ?? 0);
  }
  return { text, caret: start };
}

function keepDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT, JSON.stringify(draft));
  } catch {
    // no storage: a reload right after typing loses what was not saved yet
  }
}
/** The keys index.html kept on this load of the page (once; it stops keeping them), and what it stored is removed. */
function takeEarlyKeys(): EarlyKey[] {
  const keys = (window as { slideNgEarlyKeys?: () => EarlyKey[] }).slideNgEarlyKeys?.() ?? [];
  dropEarlyKeys();
  return keys;
}
function dropEarlyKeys() {
  try {
    sessionStorage.removeItem(EARLY_KEYS);
  } catch {
    // no storage: nothing was kept
  }
}
function takeDraft(): Draft | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT) ?? 'null') as Draft | null;
    return draft && Date.now() - draft.at < FRESH_MS ? draft : null;
  } catch {
    return null;
  }
}
