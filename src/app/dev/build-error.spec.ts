import { showStandingBuildError } from './build-error';
import { DevApi } from './dev-api';

class FakeOverlay extends HTMLElement {
  constructor(public err: { message: string }) {
    super();
  }
}

describe('showStandingBuildError', () => {
  beforeAll(() => {
    if (!customElements.get('vite-error-overlay'))
      customElements.define('vite-error-overlay', FakeOverlay);
  });
  afterEach(() => document.querySelectorAll('vite-error-overlay').forEach((e) => e.remove()));
  const api = (error: string) => ({ get: async () => ({ error }) }) as unknown as DevApi;

  it('shows the overlay again for an error that stands when the page opens', async () => {
    expect(await showStandingBuildError(api('NG8001: boom'))).toBe(true);
    const overlay = document.querySelector('vite-error-overlay') as FakeOverlay;
    expect(overlay.err.message).toBe('NG8001: boom');
  });
  it('does nothing when the last build was good, or an overlay is there already', async () => {
    expect(await showStandingBuildError(api(''))).toBe(false);
    await showStandingBuildError(api('one'));
    expect(await showStandingBuildError(api('two'))).toBe(false);
    expect(document.querySelectorAll('vite-error-overlay')).toHaveLength(1);
  });
});
