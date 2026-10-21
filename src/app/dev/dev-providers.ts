import { Provider, inject, isDevMode } from '@angular/core';
import { DRAG_SAVER } from '../drag/drag-state';
import { SYNC_TRANSPORTS } from '../sync/transport';
import { DevApi } from './dev-api';
import { WebSocketTransport } from './ws-transport';

// While developing, the companion server (scripts/dev) also carries sync between devices and writes slides.md.
// A production build replaces this file with dev-providers.prod.ts (angular.json), so none of it is in a static site.
export const DEV_PROVIDERS: Provider[] = isDevMode()
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
  : [];
