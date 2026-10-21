import { describe, expect, it } from 'vitest';
import { watchErrorOverlay, withDeckPaths } from './error-overlay-paths';

const dirs = { deck: '/home/me/talk', 'theme-paper': '/home/me/talk/node_modules/theme-paper/' };
const slides = ['slides.md:1', 'slides.md:9'];

describe('withDeckPaths', () => {
  it("names the deck's or theme's own file instead of the copy", () => {
    expect(
      withDeckPaths(
        '/x/.slide-ng/app/src/slides/generated/roots/deck/components/my-bad.ts:3:50',
        dirs,
        slides,
      ),
    ).toBe('/home/me/talk/components/my-bad.ts:3:50');
    expect(
      withDeckPaths('src/slides/generated/roots/theme-paper/layouts/cover.ts', dirs, slides),
    ).toBe('/home/me/talk/node_modules/theme-paper/layouts/cover.ts');
  });
  it('adds the markdown line of a generated slide', () => {
    expect(withDeckPaths('/a/src/slides/generated/slide-002.ts:12:4', dirs, slides)).toBe(
      '/a/src/slides/generated/slide-002.ts:12:4 (slide 2, slides.md:9)',
    );
  });
  it('leaves a path alone that it does not know', () => {
    const text = 'src/slides/generated/roots/gone/x.ts and src/slides/generated/slide-009.ts';
    expect(withDeckPaths(text, dirs, slides)).toBe(text);
  });
});

describe('watchErrorOverlay', () => {
  it('rewrites the overlay that the dev server adds to the page', async () => {
    watchErrorOverlay(dirs, slides);
    const overlay = document.createElement('vite-error-overlay');
    const root = overlay.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>.file{}</style><span class="file">/x/src/slides/generated/roots/deck/components/a.ts:1:2</span>';
    document.body.appendChild(overlay);
    await new Promise((r) => setTimeout(r));
    expect(root.querySelector('.file')!.textContent).toBe('/home/me/talk/components/a.ts:1:2');
    overlay.remove();
  });
});
