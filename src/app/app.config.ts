import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { ROUTES, provideRouter, withHashLocation } from '@angular/router';
import { HEADMATTER } from '../slides/generated';
import { SETUP_PROVIDERS } from '../slides/generated/setup';
import { LOCALE, UI_DIR, UI_TRANSLATIONS } from '../slides/generated/ui-text';
import { routes } from './app.routes';
import { DevApi } from './dev/dev-api';
import { MemoryLocationStrategy } from './lib/memory-location';
import { presenterEnabled } from './lib/switches';
import { ROUTES_SETUP, applyRoutesSetups } from './setup';
import { DRAG_SAVER } from './drag/drag-state';
import { WebSocketTransport } from './dev/ws-transport';
import { BroadcastTransport } from './sync/broadcast-transport';
import { SYNC_TRANSPORTS } from './sync/transport';
import { UI_TEXT, mergeUiText } from './i18n/ui-text';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The headmatter's `lang` (or `uiLang`) picks the interface text and the locale of the date, number and currency pipes.
    // UI_DIR: the interface text keeps its own direction when the page runs the other way.
    { provide: UI_TEXT, useValue: mergeUiText(UI_TRANSLATIONS, UI_DIR) },
    { provide: LOCALE_ID, useValue: LOCALE },
    // Headmatter `presenter: false`: the page is marked so the nav bar hides its presenter button (styles/controls.css).
    provideEnvironmentInitializer(() => {
      if (!presenterEnabled()) document.documentElement.dataset['presenter'] = 'off';
    }),
    // Providers of themes, addons and the deck's own setup/providers.ts.
    ...SETUP_PROVIDERS,
    // Headmatter `routerMode: hash` puts the slide after a # (/#/3), for hosts that cannot send every path to index.html;
    // `memory` keeps the address bar as it was (lib/memory-location.ts).
    // The routes come from a factory, so the setup/routes.ts files of the roots can add pages before the catch-all.
    provideRouter([], ...(HEADMATTER['routerMode'] === 'hash' ? [withHashLocation()] : [])),
    ...(HEADMATTER['routerMode'] === 'memory'
      ? [{ provide: LocationStrategy, useClass: MemoryLocationStrategy }]
      : []),
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
