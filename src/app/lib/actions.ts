import { DeckBrowser } from '../browser/deck-browser';
import { Drawings } from '../drawing/drawings';
import { PresenterPrefs } from '../presenter/prefs';
import { DragState } from '../drag/drag-state';
import { Dark } from './dark';
import { Fullscreen } from './fullscreen';
import { Nav } from './nav';
import { ShortcutActions } from './shortcuts';
import { Ui } from './ui-state';

// Connects the shortcut names to the things they do.
export function makeActions(
  nav: Nav,
  ui: Ui,
  dark: Dark,
  fullscreen: Fullscreen,
  drawings: Drawings,
  drag: DragState,
  prefs: PresenterPrefs,
  browser: DeckBrowser,
): ShortcutActions {
  return {
    next: () => nav.next(),
    prev: () => nav.prev(),
    nextSlide: () => nav.nextSlide(),
    prevSlide: () => nav.prevSlide(),
    toggleDark: () => dark.toggle(),
    toggleOverview: () => ui.toggleOverview(),
    toggleGoto: () => ui.toggleGoto(),
    toggleFullscreen: () => fullscreen.toggle(),
    closeAll: () => ui.closeAll(),
    overviewOpen: () => ui.overview(),
    overviewMove: (by) => ui.moveOverview(by, nav.total),
    overviewGo: () => {
      nav.go(ui.overviewPage());
      ui.overview.set(false);
    },
    drawingEnabled: () => drawings.available && drawings.enabled(),
    toggleDrawing: () => drawings.toggle(),
    dragActive: () => drag.active() !== null,
    isPresenter: () => nav.isPresenter,
    toggleClickPreview: () => prefs.toggleClickPreview(),
    browserEnabled: () => browser.config.enabled,
    browserOpen: () => browser.open(),
    toggleBrowser: () => browser.toggle(),
    hideBrowser: () => browser.hide(),
    escapeLocked: () => fullscreen.escapeIsLocked(),
  };
}
