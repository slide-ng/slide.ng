import { LocationStrategy } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { Nav, findSlide } from '../lib/nav';

// A link to another slide of the deck: <slide-ng-link to="3">go to slide 3</slide-ng-link>.
// `to` is a slide number or a `routeAlias`. (The name is not `link`, which is a built-in HTML tag.)
// The href is the slide's real address (with the deck's base, or after the # with hash routing), so a new tab or a copied
// link opens that slide; a plain click moves inside the deck.
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
  private target = computed(() =>
    findSlide(
      String(this.to()),
      this.nav.total,
      this.nav.slides.map((s) => s.routeAlias),
    ),
  );
  protected href = computed(() =>
    this.location.prepareExternalUrl(`/${this.target() ?? this.to()}`),
  );

  go(e: MouseEvent) {
    // Ctrl, Cmd, Shift or the middle button: let the browser open the address in a new tab or window.
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const no = this.target();
    if (no) this.nav.go(no);
    else
      console.warn(`[slide.ng] <slide-ng-link to="${this.to()}">: there is no slide ${this.to()}`);
    (e.target as HTMLElement).blur();
  }
}
