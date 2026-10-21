import { Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { SideEditorState } from '../dev/side-editor-state';
import { CLICKS_MAX } from '../lib/clicks';
import { Dark } from '../lib/dark';
import { Nav } from '../lib/nav';
import { Ui } from '../lib/ui-state';
import { Thumbnail } from '../ui/thumbnail';
import { ClicksSlider } from './clicks-slider';
import { NoteDisplay } from './note-display';
import { NoteStore } from './note-store';

type Status = 'editing' | 'saving' | 'saved' | 'conflict' | 'error';

// The route /overview (Slidev's slides overview): every slide in a list, with a clicks slider and its notes beside it.
// While developing, a double click on a note edits it; leaving the text saves it into the markdown file.
// Nav and Ui are provided because a few built-in components (the table of contents) read them.
@Component({
  selector: 'app-overview-page',
  imports: [Thumbnail, ClicksSlider, NoteDisplay, RouterLink],
  providers: [Nav, Ui],
  host: { class: 'block h-full overflow-y-auto bg-main text-main' },
  template: `
    <header class="flex items-center gap-4 px-6 py-3 border-b border-main">
      <h1 class="text-lg">{{ title }}</h1>
      <span class="op50 text-sm">{{ slides.length }} slides</span>
      <div class="flex-auto"></div>
      <a routerLink="/entry" class="text-sm op75 hover:op100">All pages</a>
    </header>
    <ol id="overview-list" class="m-0 p-0 list-none">
      @for (slide of slides; track $index) {
        @let no = $index + 1;
        <li class="overview-row flex gap-6 px-6 py-4 border-b border-main" [attr.data-no]="no">
          <a
            class="text-3xl op30 hover:op100 w-12 text-right flex-none"
            [routerLink]="['/', no]"
            [attr.aria-label]="'Go to slide ' + no"
            >{{ no }}</a
          >
          <div class="flex-none" [style.width.px]="width">
            <div class="border border-main rounded overflow-hidden">
              @defer (on viewport) {
                <app-thumbnail #thumb [no]="no" [width]="width" [clicks]="clicksOf(no)" />
                @if (thumb.clicksTotal() > 0) {
                  <app-clicks-slider
                    class="block px-2 py-1"
                    [current]="clicksOf(no) === max ? thumb.clicksTotal() : clicksOf(no)"
                    [total]="thumb.clicksTotal()"
                    (picked)="setClicks(no, $event)"
                  />
                }
              } @placeholder {
                <div [style.height.px]="(width * 9) / 16"></div>
              }
            </div>
          </div>
          <div class="overview-note flex-auto min-w-0" (dblclick)="edit(no)">
            @if (editing() === no) {
              <textarea
                class="overview-note-edit w-full h-full min-h-40 p-2 font-mono text-sm bg-transparent border border-primary rounded outline-none"
                style="unicode-bidi: plaintext"
                [value]="draft()"
                (input)="draft.set($any($event.target).value)"
                (blur)="save(no)"
                (keydown.escape)="editing.set(0)"
              ></textarea>
            } @else {
              <app-note-display
                [html]="slide.noteHtml"
                [clicks]="clicks()[no] ?? null"
                [placeholder]="canEdit() ? 'No notes. Double click to add some.' : 'No notes.'"
              />
            }
            @if (status()[no]; as s) {
              <div class="overview-note-status text-xs op60 mt-1" [attr.data-status]="s">
                {{ statusText[s] }}
              </div>
            }
          </div>
        </li>
      }
    </ol>
  `,
})
export class OverviewPage {
  protected readonly slides = SLIDES;
  protected readonly title = `Overview - ${HEADMATTER['title'] ?? 'slide.ng'}`;
  protected readonly width = 340;
  protected readonly max = CLICKS_MAX;
  private notes = inject(NoteStore);
  private injector = inject(Injector);
  protected canEdit = inject(SideEditorState).available;
  /** The click each slide is drawn at; not set means the final state. */
  protected clicks = signal<Record<number, number>>({});
  protected editing = signal(0);
  protected draft = signal('');
  private base = '';
  protected status = signal<Record<number, Status>>({});
  protected readonly statusText: Record<Status, string> = {
    editing: 'Editing; leave the text to save, Escape to cancel.',
    saving: 'Saving...',
    saved: 'Saved.',
    conflict: 'Not saved: the note changed in the file. Reload the page.',
    error: 'Not saved.',
  };
  protected clicksOf = (no: number) => this.clicks()[no] ?? CLICKS_MAX;

  constructor() {
    inject(Dark); // applies the light or dark class to <html>
    inject(Title).setTitle(this.title);
  }

  protected setClicks(no: number, value: number) {
    this.clicks.update((all) => ({ ...all, [no]: value }));
  }

  // Edits start from the note as the file has it now, which is also what the save compares against.
  protected async edit(no: number) {
    if (!this.canEdit() || this.editing() === no) return;
    const notes = await this.notes.load();
    const note = notes?.[no - 1];
    if (note == null) return this.setStatus(no, 'error');
    this.base = note;
    this.draft.set(note);
    this.editing.set(no);
    this.setStatus(no, 'editing');
    afterNextRender(
      () => document.querySelector<HTMLTextAreaElement>('.overview-note-edit')?.focus(),
      { injector: this.injector },
    );
  }

  protected async save(no: number) {
    if (this.editing() !== no) return;
    this.editing.set(0);
    const note = this.draft();
    if (note.trim() === this.base.trim()) return this.setStatus(no, 'saved');
    this.setStatus(no, 'saving');
    const status = await this.notes.save(no, note, this.base);
    // The file changed: the generator rebuilds the deck and the page shows the new note.
    this.setStatus(no, status === 200 ? 'saved' : status === 409 ? 'conflict' : 'error');
  }

  private setStatus(no: number, status: Status) {
    this.status.update((all) => ({ ...all, [no]: status }));
  }
}
