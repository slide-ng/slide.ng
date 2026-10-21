import { Component, Injector, afterNextRender, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { T } from '../i18n/t';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import type { UiTextKey } from '../i18n/en';
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
// While developing, a double click on a note (or Enter on it) edits it; leaving the text saves it into the markdown file.
// On a narrow screen the notes go below the slide.
// Nav and Ui are provided because a few built-in components (the table of contents) read them.
@Component({
  selector: 'app-overview-page',
  imports: [Thumbnail, ClicksSlider, NoteDisplay, RouterLink, T],
  providers: [Nav, Ui],
  host: { class: 'block h-full overflow-y-auto bg-main text-main' },
  template: `
    <header class="flex items-center gap-4 px-6 py-3 border-b border-main">
      <h1 class="text-lg">{{ title }}</h1>
      <span class="op75 text-sm">{{ 'overviewPage.count' | t: { count: slides.length } }}</span>
      <div class="flex-auto"></div>
      <a routerLink="/entry" class="text-sm op75 hover:op100">{{ 'pages.all' | t }}</a>
      @if (canEdit()) {
        <span id="overview-edit-hint" class="sr-only">{{ 'overviewPage.editHint' | t }}</span>
      }
    </header>
    <main>
      <ol id="overview-list" class="m-0 p-0 list-none">
        @for (slide of slides; track $index) {
          @let no = $index + 1;
          <li
            class="overview-row flex flex-wrap gap-6 px-6 py-4 border-b border-main"
            [attr.data-no]="no"
          >
            <a
              class="text-3xl op60 hover:op100 w-12 text-right flex-none"
              [routerLink]="['/', no]"
              [attr.aria-label]="'overview.goTo' | t: { no }"
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
            <div
              class="overview-note flex-auto min-w-0 basis-60"
              role="group"
              [attr.aria-label]="'overviewPage.notesOf' | t: { no }"
              [attr.aria-describedby]="canEdit() ? 'overview-edit-hint' : null"
              [attr.tabindex]="canEdit() ? 0 : null"
              (dblclick)="edit(no)"
              (keydown.enter)="$event.target === $event.currentTarget && edit(no)"
            >
              @if (editing() === no) {
                <textarea
                  [attr.aria-label]="'overviewPage.notesOf' | t: { no }"
                  class="overview-note-edit w-full h-full min-h-40 p-2 font-mono text-sm bg-transparent border border-primary rounded outline-none"
                  style="unicode-bidi: plaintext"
                  [value]="draft()"
                  (input)="draft.set($any($event.target).value)"
                  (blur)="save(no)"
                  (keydown.escape)="cancel(no)"
                ></textarea>
              } @else {
                <app-note-display
                  [html]="slide.noteHtml"
                  [clicks]="clicks()[no] ?? null"
                  [placeholder]="
                    (canEdit() ? 'overviewPage.noNotesEdit' : 'presenter.noNotesAtAll') | t
                  "
                />
              }
              @if (status()[no]; as s) {
                <div class="overview-note-status text-xs op60 mt-1" [attr.data-status]="s">
                  {{ statusText[s] | t }}
                </div>
              }
            </div>
          </li>
        }
      </ol>
    </main>
  `,
})
export class OverviewPage {
  protected readonly slides = SLIDES;
  protected readonly title = `${uiText(inject(UI_TEXT), 'entry.overview')} - ${HEADMATTER['title'] ?? 'slide.ng'}`;
  // Narrower on a phone, so the slide fits between the page's side paddings.
  protected readonly width = Math.min(340, window.innerWidth - 48);
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
  protected readonly statusText: Record<Status, UiTextKey> = {
    editing: 'overviewPage.editing',
    saving: 'editor.saving',
    saved: 'overviewPage.saved',
    conflict: 'overviewPage.conflict',
    error: 'overviewPage.error',
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

  // Escape: the note stays as it was and the focus goes back to it.
  protected cancel(no: number) {
    this.editing.set(0);
    this.status.update(({ [no]: _, ...rest }) => rest);
    afterNextRender(
      () =>
        document
          .querySelector<HTMLElement>(`.overview-row[data-no="${no}"] .overview-note`)
          ?.focus(),
      { injector: this.injector },
    );
  }

  private setStatus(no: number, status: Status) {
    this.status.update((all) => ({ ...all, [no]: status }));
  }
}
