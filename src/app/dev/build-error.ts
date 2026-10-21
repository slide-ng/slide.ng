import { DevApi } from './dev-api';

/** The dev server's error overlay element (Vite's client defines it). */
type OverlayElement = new (err: { message: string; stack: string }) => HTMLElement;

/**
 * Shows the dev server's error overlay for an Angular build error that stands when the page opens. Angular sends the
 * overlay once, to the pages open at the time, so a page reloaded meanwhile showed the last good slides without a sign of
 * the error. `slide-ng dev` keeps the error in the companion server (GET /build-error).
 */
export async function showStandingBuildError(
  api: DevApi,
  doc: Document = document,
): Promise<boolean> {
  const answer = await api.get<{ error: string }>('/build-error');
  if (!answer?.error) return false;
  const name = 'vite-error-overlay';
  await Promise.race([
    customElements.whenDefined(name),
    new Promise((done) => setTimeout(done, 3000)),
  ]);
  const Overlay = customElements.get(name) as OverlayElement | undefined;
  if (!Overlay || doc.querySelector(name)) return false;
  doc.body.appendChild(new Overlay({ message: answer.error, stack: '' }));
  return true;
}
