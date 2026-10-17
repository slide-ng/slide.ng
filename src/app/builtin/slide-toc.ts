import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Nav } from '../lib/nav';
import { SLIDE_NO } from '../lib/slide-context';
import { TocItem, buildTocTree, filterToc } from '../lib/toc-tree';
import { SlideLink } from './slide-link';

// One level of the list. It uses itself for the children.
@Component({
  selector: 'app-toc-list',
  imports: [SlideLink],
  template: `
    @if (list().length) {
      <ol
        [class]="classes()"
        [attr.start]="level() === 1 ? start() : null"
        [style.list-style]="style()"
      >
        @for (item of list(); track item.no) {
          <li
            class="slidev-toc-item"
            [class.slidev-toc-item-active]="item.active"
            [class.slidev-toc-item-parent-active]="item.activeParent"
          >
            <slide-ng-link [to]="item.path">
              @if (item.titleHtml) {
                <span [innerHTML]="trusted(item.titleHtml)"></span>
              } @else {
                {{ item.title }}
              }
            </slide-ng-link>
            <app-toc-list
              [list]="item.children"
              [level]="level() + 1"
              [start]="start()"
              [listClass]="listClass()"
              [listStyle]="listStyle()"
            />
          </li>
        }
      </ol>
    }
  `,
})
export class TocList {
  list = input<TocItem[]>([]);
  level = input(1);
  start = input<string | number>(1);
  listClass = input<string | string[]>('');
  listStyle = input<string | string[]>('');

  protected classes = computed(() =>
    [
      [this.listClass()].flat().join(' '),
      'slidev-toc-list',
      `slidev-toc-list-level-${this.level()}`,
    ].join(' '),
  );
  // The generator drew the title's math with KaTeX from the deck's own markdown; the sanitizer would strip KaTeX's styles.
  private sanitizer = inject(DomSanitizer);
  protected trusted = (html: string): SafeHtml => this.sanitizer.bypassSecurityTrustHtml(html);
  // `listStyle` gives one list-style per level, like Slidev; a single style applies at every level.
  protected style = computed(() => {
    const style = this.listStyle();
    return (Array.isArray(style) ? style[this.level() - 1] : style) || null;
  });
}

// <slide-ng-toc /> is the table of contents, built from the slides' titles and levels (Slidev's <Toc />).
//   columns, listClass, start, listStyle, minDepth, maxDepth, mode = all | onlyCurrentTree | onlySiblings
@Component({
  selector: 'slide-ng-toc',
  imports: [TocList],
  host: { class: 'slidev-toc block', '[style.column-count]': 'columns()' },
  template: `<app-toc-list
    [list]="items()"
    [start]="start()"
    [listClass]="listClass()"
    [listStyle]="listStyle()"
  />`,
})
export class SlideToc {
  columns = input(1, { transform: numberAttribute });
  listClass = input<string | string[]>('');
  start = input<string | number>(1);
  listStyle = input<string | string[]>('');
  maxDepth = input(Infinity, { transform: numberAttribute });
  minDepth = input(1, { transform: numberAttribute });
  mode = input<'all' | 'onlyCurrentTree' | 'onlySiblings'>('all');

  private nav = inject(Nav);
  // The slide the list is on decides what is "current" (in the PDF every slide is drawn at once, Nav.no() stays 1).
  private no = inject(SLIDE_NO);
  protected items = computed(() =>
    filterToc(buildTocTree(this.nav.tocSlides, this.no), {
      minDepth: this.minDepth(),
      maxDepth: this.maxDepth(),
      mode: this.mode(),
    }),
  );
}
