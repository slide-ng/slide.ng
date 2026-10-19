// Navigation: which slide is on screen and how to move. Port of the useNav.ts parts that
// matter for playing a deck. It is provided by the Deck component, so it can read the route.
import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { SLIDES } from '../../slides/generated';
import { CLICKS_MAX, ClicksContext } from './clicks';
import { buildTocTree } from './toc-tree';

// Slide number or routeAlias from the address -> slide index (1-based), or null when nothing matches.
export function findSlide(param: string, total: number, aliases: (string | null)[]): number | null {
  if (/^\d+$/.test(param)) return Math.min(Math.max(+param, 1), total); // /99 shows the last slide
  const i = aliases.indexOf(param);
  return i < 0 ? null : i + 1;
}

@Injectable()
export class Nav {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  readonly slides = SLIDES;
  readonly total = SLIDES.length;

  private param = toSignal(this.route.paramMap.pipe(map((p) => p.get('no') ?? '1')), {
    initialValue: this.route.snapshot.paramMap.get('no') ?? '1',
  });
  private found = computed(() =>
    findSlide(
      this.param(),
      this.total,
      SLIDES.map((s) => s.routeAlias),
    ),
  );
  /** The presenter route (`/presenter/:no`) has the same navigation as the play route (`/:no`), under another base address. */
  readonly isPresenter = this.route.snapshot.data['mode'] === 'presenter';
  private base = this.isPresenter ? '/presenter' : '/';
  /** Slide on screen, 1-based. */
  readonly no = computed(() => this.found() ?? 1);
  /** The address matches no slide: the 404 layout is shown. */
  readonly notFound = computed(() => this.found() === null);
  readonly meta = computed(() => SLIDES[this.no() - 1]);
  /** Slidev's names, for `$nav` in slides: the slide on screen, its layout and its frontmatter. */
  readonly currentPage = this.no;
  readonly currentLayout = computed(() => this.meta().layout);
  readonly currentFrontmatter = computed(() => this.meta().frontmatter);

  /** Clicks of the slide on screen (set by the deck when it creates the slide). */
  readonly ctx = signal<ClicksContext | null>(null);
  private ctxNo = signal(0);
  /** The clicks of the slide on screen are known: its component exists, is drawn, and is the slide of `no()` (not the one that is leaving). */
  readonly ready = computed(() => !!this.ctx()?.mounted() && this.ctxNo() === this.no());
  /** Tell Nav which slide `ctx` belongs to (the slide show calls this when it creates a slide). */
  setContext(no: number, ctx: ClicksContext | null) {
    this.ctxNo.set(no);
    this.ctx.set(ctx);
  }

  /** 1 while moving forward, -1 backward (for transitions and `forward:` / `backward:` classes). */
  readonly direction = signal(0);

  readonly clicks = computed(() => this.ctx()?.current() ?? 0);
  readonly clicksTotal = computed(() => this.ctx()?.total() ?? 0);
  readonly hasNext = computed(() => this.no() < this.total || this.clicks() < this.clicksTotal());
  readonly hasPrev = computed(() => this.no() > 1 || this.clicks() > 0);

  /** The slides as the table of contents sees them. */
  readonly tocSlides = SLIDES.map((s, i) => ({
    no: i + 1,
    title: s.title,
    titleHtml: s.titleHtml ?? null,
    level: s.level,
    routeAlias: s.routeAlias,
    hideInToc: s.hideInToc,
  }));
  readonly tocTree = computed(() => buildTocTree(this.tocSlides, this.no()));

  /** Next click, or the next slide when the clicks are used up. */
  next() {
    const ctx = this.ctx();
    if (ctx && ctx.current() < ctx.total()) ctx.next();
    else this.nextSlide();
  }

  /** Previous click, or the previous slide (at its last click) when already at the first click. */
  prev() {
    const ctx = this.ctx();
    if (ctx && ctx.current() > ctx.clicksStart) ctx.prev();
    else this.prevSlide(true);
  }

  nextSlide() {
    if (this.no() < this.total) this.go(this.no() + 1, 0);
  }
  prevSlide(lastClicks = false) {
    if (this.no() > 1) this.go(this.no() - 1, lastClicks ? CLICKS_MAX : 0);
  }

  /** Go to slide `no` at click `clicks` (the slide clamps it to its own range). */
  go(no: number, clicks = 0, replace = false) {
    const slide = SLIDES[no - 1];
    return this.router.navigate([this.base, slide?.routeAlias ?? no], {
      queryParams: { clicks },
      replaceUrl: replace,
    });
  }

  /** Open the presenter page / the play page at this slide and click. */
  enterPresenter() {
    return this.switchTo('/presenter');
  }
  exitPresenter() {
    return this.switchTo('/');
  }
  private switchTo(base: string) {
    const slide = SLIDES[this.no() - 1];
    return this.router.navigate([base, slide?.routeAlias ?? this.no()], {
      queryParams: { clicks: this.clicks() },
    });
  }

  /**
   * A move that came from another window: same slide means only the click changes,
   * another slide replaces the current history entry (the back button is not filled with remote moves).
   */
  jump(no: number, clicks: number) {
    if (no === this.no()) this.ctx()?.setCurrent(clicks);
    else this.go(no, clicks, true);
  }

  /** `?clicks=` of the address, or null. `Location` also sees the part after `#` when the router uses hash addresses. */
  clicksParam(): string | null {
    return new URLSearchParams(this.location.path().split('?')[1] ?? '').get('clicks');
  }

  /** Keep `?clicks=` up to date without a navigation (no history entry, the router stays quiet). */
  writeClicksParam(clicks: number) {
    const [path, query = ''] = this.location.path().split('?');
    const params = new URLSearchParams(query);
    params.set('clicks', String(clicks));
    this.location.replaceState(path, params.toString());
  }
}
