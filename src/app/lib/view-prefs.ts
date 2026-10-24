import { Injectable } from '@angular/core';
import { Filters, defaultFilters } from './filters';
import { NavPositionName } from './nav-position';
import { storedSignal } from './stored-signal';

/** What a viewer chooses about how slides look on their screen, remembered in the browser. */
@Injectable({ providedIn: 'root' })
export class ViewPrefs {
  readonly filters = storedSignal<Filters>('slidev-viewer-css-filter', defaultFilters);
  /**
   * Where the bar sits on the slide page (lib/nav-position.ts), chosen in the settings menu. Null is no choice: the deck's
   * `navPosition` is used, also after its author changes it.
   */
  readonly navPosition = storedSignal<NavPositionName | null>('slide-ng-nav-position', null);
}
