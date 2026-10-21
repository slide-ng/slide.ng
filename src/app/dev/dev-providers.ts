import {
  EnvironmentProviders,
  Provider,
  inject,
  isDevMode,
  provideEnvironmentInitializer,
} from '@angular/core';
import { ROOT_DIRS, SLIDE_SOURCES } from '../../slides/generated/source-paths';
import { DRAG_SAVER } from '../drag/drag-state';
import { SYNC_TRANSPORTS } from '../sync/transport';
import { DevApi } from './dev-api';
import { watchErrorOverlay } from './error-overlay-paths';
import { WebSocketTransport } from './ws-transport';

// While developing, the companion server (scripts/dev) also carries sync between devices and writes slides.md.
// A production build replaces this file with dev-providers.prod.ts (angular.json), so none of it is in a static site.
export const DEV_PROVIDERS: (Provider | EnvironmentProviders)[] = isDevMode()
  ? [
      // The dev server's error overlay names the author's files, not the generated copies.
      provideEnvironmentInitializer(() => watchErrorOverlay(ROOT_DIRS, SLIDE_SOURCES)),
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
  : [];
