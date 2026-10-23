import { DOCUMENT, formatDate } from '@angular/common';
import { Component, DestroyRef, LOCALE_ID, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { HEADMATTER, SLIDES } from '../../slides/generated';
import { Dark } from '../lib/dark';
import { parseRange } from '../lib/range';
import { NoteDisplay } from '../presenter/note-display';
import { UI_TEXT, uiText } from '../i18n/ui-text';

// The route /presenter/print: the notes of every slide that has some, as one A4 document (`slide-ng export-notes`).
// `?range=1,3-5` keeps only those slides. The date and the slide numbers are dimmed only as far as a 4.5:1 contrast allows.
@Component({
  selector: 'app-notes-print',
  imports: [NoteDisplay],
  template: `
    <main id="notes-print" data-slide-ng-print="ready" class="p-4 min-h-screen bg-main text-main">
      <div class="mb-10">
        <h1 class="text-4xl font-bold mt-2">{{ title }}</h1>
        <div class="opacity-75">{{ date }}</div>
      </div>
      @for (slide of withNotes; track slide.no; let last = $last) {
        <div class="flex flex-col gap-4 break-inside-avoid-page">
          <h2 class="text-lg font-bold flex gap-2">
            <span class="opacity-75">{{ slide.no }}/{{ total }}</span
            >{{ slide.title }}
          </h2>
          <app-note-display [html]="slide.html" />
          @if (!last) {
            <hr class="border-main mb-8" />
          }
        </div>
      }
    </main>
  `,
})
export class NotesPrint {
  protected readonly total = SLIDES.length;
  protected readonly title = String(HEADMATTER['title'] ?? 'slide.ng');
  // In the deck's language (`lang`), like the `date` pipe in slides.
  protected readonly date = formatDate(new Date(), 'medium', inject(LOCALE_ID));
  private readonly pages = new Set(
    parseRange(SLIDES.length, inject(ActivatedRoute).snapshot.queryParamMap.get('range')),
  );
  protected readonly withNotes = SLIDES.map((s, i) => ({
    no: i + 1,
    title: s.title,
    html: s.noteHtml,
  })).filter((s) => s.html && this.pages.has(s.no));

  constructor() {
    inject(Title).setTitle(uiText(inject(UI_TEXT), 'notes.pageTitle', { title: this.title }));
    inject(Dark);
    const doc = inject(DOCUMENT);
    doc.documentElement.classList.add('print');
    // A4 with a little room at the top and bottom, like Slidev's notes page. The page behind the notes has their colour:
    // the deck's black would show below the last note, where the notes end before the paper does.
    const style = doc.createElement('style');
    style.textContent =
      '@page { size: A4; margin-top: 1.5cm; margin-bottom: 1cm; }' +
      ' html, html body { background: #fff; } html.dark, html.dark body { background: #121212; }';
    doc.head.append(style);
    inject(DestroyRef).onDestroy(() => {
      doc.documentElement.classList.remove('print');
      style.remove();
    });
  }
}
