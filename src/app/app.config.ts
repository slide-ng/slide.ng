import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { ROUTES, provideRouter, withHashLocation } from '@angular/router';
import { HEADMATTER } from '../slides/generated';
import { SETUP_PROVIDERS } from '../slides/generated/setup';
import { routes } from './app.routes';
import { DevApi } from './dev/dev-api';
import { presenterEnabled } from './lib/switches';
import { ROUTES_SETUP, applyRoutesSetups } from './setup';
import { DRAG_SAVER } from './drag/drag-state';
import { WebSocketTransport } from './dev/ws-transport';
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
    // The routes come from a factory, so the setup/routes.ts files of the roots can add pages before the catch-all.
    provideRouter([], ...(HEADMATTER['routerMode'] === 'hash' ? [withHashLocation()] : [])),
    {
      provide: ROUTES,
      multi: true,
      useFactory: () => applyRoutesSetups(routes, inject(ROUTES_SETUP)),
    },
    // Windows of the same browser stay in step through a BroadcastChannel.
    { provide: SYNC_TRANSPORTS, multi: true, useFactory: () => new BroadcastTransport() },
    // While developing, the companion server (scripts/dev) also carries sync between devices and writes slides.md.
    ...(isDevMode()
      ? [
          {
            provide: SYNC_TRANSPORTS,
            multi: true,
            useFactory: () => new WebSocketTransport(inject(DevApi)),
          },
          {
            provide: DRAG_SAVER,
            useFactory: () => {
              const api = inject(DevApi);
              return (s: { slide: number; site: number; pos: string }) =>
                void api.send('POST', `/slides/${s.slide}/drag`, { site: s.site, pos: s.pos });
            },
          },
        ]
      : []),
  ],
};
