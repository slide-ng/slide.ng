import { Component, inject, isDevMode, signal } from '@angular/core';
import { PWA } from '../../slides/generated';
import { UI_TEXT, uiText } from '../i18n/ui-text';
import { offlineReady } from '../lib/offline-worker';

// A small label in the bottom right corner of the deck (headmatter `pwa`, static builds only): "Available offline" once
// the service worker has stored the deck, "Offline" while the browser has no network. The print route does not use it.
@Component({
  selector: 'app-offline-badge',
  host: { '(window:online)': 'online.set(true)', '(window:offline)': 'online.set(false)' },
  template: `
    @if (enabled && label(); as text) {
      <div
        id="offline-badge"
        role="status"
        class="absolute bottom-0 end-0 m-2 px-2 py-0.5 rounded text-xs bg-main text-main border border-main opacity-60 pointer-events-none select-none"
      >
        {{ text }}
      </div>
    }
  `,
})
export class OfflineBadge {
  protected enabled = PWA && !isDevMode();
  protected online = signal(navigator.onLine);
  private text = inject(UI_TEXT);
  protected label = () =>
    !this.online()
      ? uiText(this.text, 'offline.offline')
      : offlineReady()
        ? uiText(this.text, 'offline.ready')
        : '';
}
