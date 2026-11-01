import { Component, computed, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SLIDES, HEADMATTER } from '../../slides/generated';
import { Dark } from '../lib/dark';
import { Fullscreen } from '../lib/fullscreen';
import { storedSignal } from '../lib/stored-signal';
import { SyncState } from '../sync/sync-state';
import { IconBtn } from '../ui/icon-btn';
import { T } from '../i18n/t';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { ClicksSlider } from './clicks-slider';
import { NoteDisplay } from './note-display';
import { ProgressBar } from './progress-bar';
import { TimerBar } from './timer-bar';

// The route /notes: only the notes, for a second screen or another device. It follows the
// presenter (page and click come from the shared state) and has no navigation of its own.
@Component({
  selector: 'app-notes-page',
  imports: [ProgressBar, TimerBar, NoteDisplay, ClicksSlider, IconBtn, T],
  host: { class: 'block h-full' },
  templateUrl: './notes-page.html',
})
export class NotesPage {
  protected fullscreen = inject(Fullscreen);
  private sync = inject(SyncState);
  protected state = this.sync.shared;
  protected total = SLIDES.length;
  protected fontSize = storedSignal('slidev-notes-font-size', 18);
  // Until a presenter says where it is, show slide 1.
  protected page = computed(() => Math.min(Math.max(this.state().page, 1), this.total));
  protected html = computed(() => SLIDES[this.page() - 1].noteHtml);

  protected readonly title = uiText(inject(UI_TEXT), 'notes.pageTitle', {
    title: String(HEADMATTER['title'] ?? 'slide.ng'),
  });

  constructor() {
    inject(Title).setTitle(this.title);
    inject(Dark); // the deck's colour scheme (colorSchema, the system or the last choice) on <html>
    this.sync.sendHello(); // the presenter answers with where it is
  }
}
