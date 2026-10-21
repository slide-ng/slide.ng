import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { HEADMATTER } from '../slides/generated';
import { SETUP_PROVIDERS } from '../slides/generated/setup';
import { routes } from './app.routes';
import { DEV_PROVIDERS } from './dev/dev-providers';
import { presenterEnabled } from './lib/switches';
import { BroadcastTransport } from './sync/broadcast-transport';
import { SYNC_TRANSPORTS } from './sync/transport';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Headmatter `presenter: false`: the page is marked so the nav bar hides its presenter button (styles/controls.css).
    provideEnvironmentInitializer(() => {
      if (!presenterEnabled()) document.documentElement.dataset['presenter'] = 'off';
    }),
    // Providers of themes, addons and the deck's own setup/providers.ts.
    ...SETUP_PROVIDERS,
    // Headmatter `routerMode: hash` puts the slide after a # (/#/3), for hosts that cannot send every path to index.html.
    provideRouter(routes, ...(HEADMATTER['routerMode'] === 'hash' ? [withHashLocation()] : [])),
    // Windows of the same browser stay in step through a BroadcastChannel.
    { provide: SYNC_TRANSPORTS, multi: true, useFactory: () => new BroadcastTransport() },
    // While developing, the companion server also syncs devices and saves (dev/dev-providers.ts).
    ...DEV_PROVIDERS,
  ],
};
