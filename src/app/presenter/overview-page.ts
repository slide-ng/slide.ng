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
  templateUrl: './overview-page.html',
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
  private text = inject(UI_TEXT);
  /** The live region's text: the last save of a note, with the slide it belongs to. */
  protected announcement = signal('');
  private announced?: ReturnType<typeof setTimeout>;

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
    // How a save ended is said out loud; "Editing" and "Saving" are not, the focus already tells.
    if (status === 'editing' || status === 'saving') return;
    const said = `${uiText(this.text, 'overviewPage.notesOf', { no })}: ${uiText(this.text, this.statusText[status])}`;
    // Emptied first, so the same words a second time are heard again.
    this.announcement.set('');
    clearTimeout(this.announced);
    this.announced = setTimeout(() => this.announcement.set(said), 50);
  }
}
