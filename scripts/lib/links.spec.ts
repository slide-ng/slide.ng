import { htmlSlideLinks } from './links.mjs';

describe('htmlSlideLinks', () => {
  it('turns an HTML link to a slide number or routeAlias into <slide-ng-link>, keeping class, id and style', () => {
    expect(htmlSlideLinks('<p>See <a href="/3" class="big">slide 3</a>.</p>')).toBe(
      '<p>See <slide-ng-link to="3" class="big">slide 3</slide-ng-link>.</p>',
    );
    expect(htmlSlideLinks('<a href="#/pricing"><b>Pricing</b></a>', { aliases: ['pricing'] })).toBe(
      '<slide-ng-link to="pricing"><b>Pricing</b></slide-ng-link>',
    );
  });
  it('leaves other links alone, and warns about a slide link with other attributes', () => {
    const warn = vi.fn();
    const web = '<a href="https://example.org" target="_blank">web</a>';
    expect(htmlSlideLinks(web, { warn })).toBe(web);
    expect(htmlSlideLinks('<a href="/overview">all</a>', { warn })).toBe(
      '<a href="/overview">all</a>',
    );
    expect(warn).not.toHaveBeenCalled();
    const kept = '<a href="/3" target="_blank">new tab</a>';
    expect(htmlSlideLinks(kept, { warn })).toBe(kept);
    expect(warn.mock.calls[0][0]).toContain('[text](/3) or <slide-ng-link to="3">');
  });
  it('says which <a> of an href it is, so the warning can name its line', () => {
    const warn = vi.fn();
    htmlSlideLinks('<a href="/3" target="_blank">a</a> <a href="/3" target="_blank">b</a>', {
      warn,
    });
    expect(warn.mock.calls.map((c) => c[1])).toEqual([
      { href: '/3', nth: 0 },
      { href: '/3', nth: 1 },
    ]);
  });
  it('leaves #/3 with a target alone in a hash deck, where it reaches the slide', () => {
    const warn = vi.fn();
    const kept = '<a href="#/3" target="_blank">new tab</a>';
    expect(htmlSlideLinks(kept, { warn, hash: true })).toBe(kept);
    expect(warn).not.toHaveBeenCalled();
    expect(htmlSlideLinks(kept, { warn })).toBe(kept);
    expect(warn.mock.calls[0][0]).toContain('without routerMode: hash it does not reach the slide');
  });
  it('warns about a number past the last slide', () => {
    const warn = vi.fn();
    htmlSlideLinks('<a href="/9">x</a>', { total: 4, warn });
    expect(warn.mock.calls[0][0]).toContain('goes to slide 9, but the deck has 4 slides');
  });
});
