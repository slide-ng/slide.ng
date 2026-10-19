import { LocationStrategy } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Nav, findSlide } from '../lib/nav';
import { RENDER_CONTEXT } from '../lib/slide-context';
import { printAnchor } from '../print/print-anchor';

// A link to another slide of the deck: <slide-ng-link to="3">go to slide 3</slide-ng-link>.
// `to` is a slide number or a `routeAlias`. (The name is not `link`, which is a built-in HTML tag.)
// The href is the slide's real address (with the deck's base, or after the # with hash routing), so a new tab or a copied
// link opens that slide; a plain click moves inside the deck. On the print page (and so in a PDF) it points at the first page
// of that slide instead.
@Component({
  selector: 'slide-ng-link',
  // `title` is the link's text when it has none, as in Slidev's <Link to="7" title="Details" />.
  template: `<a [href]="href()" (click)="go($event)"
    ><ng-content>{{ title() }}</ng-content></a
  >`,
})
export class SlideLink {
  to = input.required<string | number>();
  title = input('');
  private nav = inject(Nav);
  private location = inject(LocationStrategy);
  private isPrint = inject(RENDER_CONTEXT) === 'print';
  private target = computed(() =>
    findSlide(
      String(this.to()),
      this.nav.total,
      this.nav.slides.map((s) => s.routeAlias),
    ),
  );
  protected href = computed(() => {
    const no = this.target();
    if (this.isPrint) return no ? `#${printAnchor(no)}` : null;
    return this.location.prepareExternalUrl(`/${no ?? this.to()}`);
  });

  go(e: MouseEvent) {
    // Ctrl, Cmd, Shift or the middle button: let the browser open the address in a new tab or window.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const no = this.target();
    // The print page has a <base>, which would turn `#anchor` into another address: scroll to the page instead.
    if (no && this.isPrint)
      document.getElementById(printAnchor(no))?.scrollIntoView({ block: 'start' });
    else if (no) this.nav.go(no);
    else
      console.warn(`[slide.ng] <slide-ng-link to="${this.to()}">: there is no slide ${this.to()}`);
    (e.target as HTMLElement).blur();
  }
}
