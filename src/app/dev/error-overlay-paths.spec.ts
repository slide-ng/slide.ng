import { describe, expect, it } from 'vitest';
import { sameError, watchErrorOverlay, withDeckPaths } from './error-overlay-paths';

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
  it('adds the place once, also to text that the terminal named already', () => {
    const named = '/a/src/slides/generated/slide-002.ts:12:4 (slide 2, slides.md:11)';
    expect(withDeckPaths(named, dirs, slides)).toBe(named);
    const longer = '/a/src/slides/generated/slide-002.ts:13:398 (slide 2, slides.md:30)';
    expect(withDeckPaths(longer, dirs, slides)).toBe(longer);
  });
  it('leaves a path alone that it does not know', () => {
    const text = 'src/slides/generated/roots/gone/x.ts and src/slides/generated/slide-009.ts';
    expect(withDeckPaths(text, dirs, slides)).toBe(text);
  });
});

describe('watchErrorOverlay', () => {
  it('rewrites the overlay that the dev server adds to the page', async () => {
    const stop = watchErrorOverlay(dirs, slides);
    const overlay = document.createElement('vite-error-overlay');
    const root = overlay.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>.file{}</style><span class="file">/x/src/slides/generated/roots/deck/components/a.ts:1:2</span>';
    document.body.appendChild(overlay);
    await new Promise((r) => setTimeout(r));
    expect(root.querySelector('.file')!.textContent).toBe('/home/me/talk/components/a.ts:1:2');
    overlay.remove();
    stop();
  });
});

describe('sameError', () => {
  const stored = {
    error: "NG8001: 'flag-badgee' is not a known element: (did you mean <flag-badge>?)\n1. If ...",
    file: '/a/src/slides/generated/slide-002.ts:12:4 (slide 2, slides.md:11)',
  };
  it('matches the overlay of the same error, without the did-you-mean the terminal adds', () => {
    const message = "NG8001: 'flag-badgee' is not a known element:\n1. If ...";
    expect(sameError({ message, file: '/a/src/slides/generated/slide-002.ts:12:4' }, stored)).toBe(
      true,
    );
    expect(sameError({ message, file: '/a/src/slides/generated/slide-002.ts:14:9' }, stored)).toBe(
      false,
    );
    expect(sameError({ message: 'NG8002: other', file: '' }, stored)).toBe(false);
  });
});

describe('watchErrorOverlay: the text of the companion server', () => {
  const overlay = (message: string, file: string) => {
    const element = document.createElement('vite-error-overlay');
    const root = element.attachShadow({ mode: 'open' });
    root.innerHTML = `<span class="plugin"></span><div class="message-body">${message}</div><span class="file">${file}</span><div class="frame"></div><div class="stack"></div>`;
    return { element, text: (s: string) => root.querySelector(s)!.textContent };
  };
  it('shows the error as the terminal and a reloaded page name it, once the companion has it', async () => {
    let calls = 0;
    const answers = [
      { error: '' },
      {
        error: "NG8001: 'x-y' is not a known element: (did you mean <x-z>?)",
        file: '/a/src/slides/generated/slide-002.ts:12:4 (slide 2, slides.md:11)',
      },
    ];
    const stop = watchErrorOverlay(dirs, slides, async () => answers[Math.min(calls++, 1)], {
      everyMs: 1,
    });
    const o = overlay(
      "NG8001: 'x-y' is not a known element:",
      '/a/src/slides/generated/slide-002.ts:12:4',
    );
    document.body.appendChild(o.element);
    await new Promise((r) => setTimeout(r, 30));
    expect(o.text('.message-body')).toBe(
      "NG8001: 'x-y' is not a known element: (did you mean <x-z>?)",
    );
    expect(o.text('.file')).toBe(
      '/a/src/slides/generated/slide-002.ts:12:4 (slide 2, slides.md:11)',
    );
    o.element.remove();
    stop();
  });
  it("shows the generator's error instead of the Angular error of the last good slides", async () => {
    const stop = watchErrorOverlay(dirs, slides, async () => ({
      error: "NG8001: 'x-y' is not a known element:",
      file: '/a/src/slides/generated/slide-002.ts:12:4',
      problem: 'slide 2: <div class="mt-2"> is never closed; add </div> where it should end',
    }));
    const o = overlay(
      "NG8001: 'x-y' is not a known element:",
      '/a/src/slides/generated/slide-002.ts:12:4',
    );
    document.body.appendChild(o.element);
    await new Promise((r) => setTimeout(r, 10));
    expect(o.text('.message-body')).toBe(
      'slide 2: <div class="mt-2"> is never closed; add </div> where it should end',
    );
    expect(o.text('.file')).toBe('');
    o.element.remove();
    stop();
  });
});
