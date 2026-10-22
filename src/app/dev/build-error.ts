import { DevApi } from './dev-api';

/** The dev server's error overlay element (Vite's client defines it). */
type OverlayElement = new (err: { message: string; stack: string }) => HTMLElement;

/**
 * What the companion server knows of the build (GET /build-error): the Angular error that stands (`error`, with the did-you-mean
 * and the markdown line the terminal shows, and the `file` line), and the generator's error (`problem`) when slides.md could not
 * be read and the last good slides are kept. Empty strings when there is none.
 */
export interface StandingError {
  error: string;
  file?: string;
  problem?: string;
}

/**
 * What the overlay shows for `answer`, or null when the build is good. The generator's error comes first: while it stands the
 * slides on screen are the last good ones, so an Angular error in them is one the author has fixed already, and the banner
 * that names the generator's error is in a bundle that cannot be built.
 */
export function overlayContent(
  answer: StandingError | null | undefined,
): { message: string; file: string } | null {
  if (!answer?.error) return null;
  if (answer.problem) return { message: answer.problem, file: '' };
  return { message: answer.error, file: answer.file ?? '' };
}

/** Writes `content` into a `vite-error-overlay`, so the overlay of a live page and of a reloaded one read the same. */
export function fillOverlay(overlay: Element, content: { message: string; file: string }) {
  const root = overlay.shadowRoot;
  if (!root) return;
  const set = (selector: string, text: string) => {
    const el = root.querySelector(selector);
    if (el) el.textContent = text;
  };
  set('.plugin', '');
  set('.message-body', content.message);
  set('.file', content.file);
  set('.frame', '');
  set('.stack', '');
}

/**
 * Shows the dev server's error overlay for an Angular build error that stands when the page opens. Angular sends the
 * overlay once, to the pages open at the time, so a page reloaded meanwhile showed the last good slides without a sign of
 * the error. `slide-ng dev` keeps the error in the companion server (GET /build-error).
 */
export async function showStandingBuildError(
  api: DevApi,
  doc: Document = document,
): Promise<boolean> {
  const content = overlayContent(await api.get<StandingError>('/build-error'));
  if (!content) return false;
  const name = 'vite-error-overlay';
  await Promise.race([
    customElements.whenDefined(name),
    new Promise((done) => setTimeout(done, 3000)),
  ]);
  const Overlay = customElements.get(name) as OverlayElement | undefined;
  if (!Overlay || doc.querySelector(name)) return false;
  const overlay = new Overlay({ message: content.message, stack: '' });
  fillOverlay(overlay, content);
  doc.body.appendChild(overlay);
  return true;
}
