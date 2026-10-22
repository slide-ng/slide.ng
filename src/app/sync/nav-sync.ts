// Keeps this window's slide and click in step with the other windows.
// The presenter drives and the audience follows. A viewer on this machine may also drive
// (like Slidev); a viewer on another machine only follows.
import { DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { Nav } from '../lib/nav';
import { SharedState } from './shared-state';
import { SyncState } from './sync-state';
import { scopedKey } from '../lib/deck-scope';

// Slidev's TRUST_ORIGINS: only these hosts may send navigation as a viewer.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** A viewer may drive when the page is on this machine: a local host name, or a folder opened from disk (file://). */
export function isLocalPage(loc: Pick<Location, 'protocol' | 'hostname'>): boolean {
  return loc.protocol === 'file:' || LOCAL_HOSTS.includes(loc.hostname);
}

const SAVED = 'slide-ng-last-move'; // sessionStorage: a presenter page's last move, so a reload of that tab keeps its time

/**
 * The time of a presenter's first position after its page opens. It is not a new move: a presenter page that opens or
 * reloads must not take the audience away from a newer move of another presenter. So it is the time of this tab's last
 * move when the page reloads at that move (`saved`, from sessionStorage), else 0, which is older than any move.
 */
export function firstMoveTime(saved: unknown, page: number, clicks: number): number {
  if (typeof saved !== 'object' || saved === null) return 0;
  const { page: p, clicks: c, time } = saved as Record<string, unknown>;
  return p === page && c === clicks && typeof time === 'number' && Number.isFinite(time) ? time : 0;
}

function readSaved(): unknown {
  try {
    return JSON.parse(sessionStorage.getItem(scopedKey(SAVED)) ?? 'null');
  } catch {
    return null; // storage blocked or not JSON
  }
}

/** Call once, in the constructor of a page that has a Nav (the deck or the presenter). */
export function startNavSync(nav: Nav) {
  const sync = inject(SyncState);
  const type = nav.isPresenter ? 'presenter' : 'viewer';
  const mayShare = nav.isPresenter || isLocalPage(location);
  let applied = ''; // "page:clicks" of the last move that came from outside: it is not sent back
  let appliedFrom = ''; // the window that made it
  let first = true;
  let lastMove: SharedState['lastUpdate'] = null; // our last move as it was sent
  let followed = 0; // the time of the newest move we followed

  // `again`: the answer to a window that just opened. It is our last move once more, with that move's time: a fresh time
  // would make it the newest move, and with two presenter windows the audience would jump to the one that answered last.
  // `firstTime`: a presenter's first position after its page opened, with an old time (firstMoveTime), for the same reason.
  const send = (via?: string, again = false, firstTime?: number) => {
    const d = sync.directions();
    if (!(nav.isPresenter ? d.presenterSend : d.viewerSend) || !mayShare) return;
    if (again && !lastMove) return; // nothing sent yet: our first position goes out when the slide is there
    if (firstTime !== undefined) lastMove = { id: sync.id, type, time: firstTime };
    else if (!again) {
      lastMove = { id: sync.id, type, time: Date.now(), ...(via ? { via } : {}) };
      if (nav.isPresenter) {
        try {
          sessionStorage.setItem(
            scopedKey(SAVED),
            JSON.stringify({ page: nav.no(), clicks: nav.clicks(), time: lastMove.time }),
          );
        } catch {
          /* a reload then starts with an old time */
        }
      }
    }
    sync.patchShared({
      page: nav.no(),
      clicks: nav.clicks(),
      clicksTotal: nav.clicksTotal(),
      lastUpdate: lastMove,
    });
  };
  // After a move from outside that this window could not take as it came (a step past the slide's last click): say where it
  // is, so the sender (MCP's goto_slide) learns the step it took. A window that may not drive only reports it (the others do
  // not follow a report).
  const report = () =>
    mayShare ? send() : sync.reportPosition({ page: nav.no(), clicks: nav.clicks() });

  // Our position changed: tell the others. The very first position of a viewer is not news
  // (a viewer that just opened would drag the presenter back to its own slide). The very first position of a presenter
  // goes out with an old time (0 for a new page): the audience does not follow it (see below).
  effect(() => {
    const page = nav.no(),
      clicks = nav.clicks(),
      mounted = nav.ready();
    nav.clicksTotal();
    untracked(() => {
      if (!mounted) return; // the slide is still being created
      const fromOutside = applied === `${page}:${clicks}`;
      const from = appliedFrom;
      const followed = applied !== '';
      applied = appliedFrom = '';
      const initial = first;
      first = false;
      // A viewer's move reached the presenter: pass it on, so the other viewers follow too (as Slidev's presenter does).
      if (fromOutside && nav.isPresenter && from) return send(from);
      if (fromOutside || (initial && !nav.isPresenter)) return;
      if (initial) return send(undefined, false, firstMoveTime(readSaved(), page, clicks));
      if (followed) return report();
      send();
    });
  });

  // Someone else moved: follow. Only a new move of the other kind of window counts, not a moving cursor or the timer. It is
  // read from `moves`, not from the merged `shared`: MCP's goto_slide sends one move as a viewer and one as a presenter with
  // the same time, and when both came before this effect ran, `shared` holds only the second (sync-state.ts).
  const other = nav.isPresenter ? 'viewer' : 'presenter';
  const moved = computed(() => {
    const m = sync.moves()[other];
    return m ? `${m.page}:${m.clicks}:${m.lastUpdate.time}:${m.lastUpdate.id}` : '';
  });
  effect(() => {
    moved();
    untracked(() => {
      const s = sync.moves()[other];
      const d = sync.directions();
      if (!(nav.isPresenter ? d.presenterReceive : d.viewerReceive)) return;
      if (!s || s.page < 1) return;
      // Our own move: passed on by the presenter, or made by this window while it was the presenter page (the state stays
      // when the window moves from /presenter/3 to /1).
      if (s.lastUpdate.via === sync.id || s.lastUpdate.id === sync.id) return;
      // A presenter's first position after its page opened (time 0) is not a move. A window at the start of the deck
      // (slide 1, no click: a viewer that opens later) joins it; a window anywhere else keeps its own slide (its address).
      // Else a window that opened or reloaded at /6 after the presenter that moved was closed went to an idle presenter's
      // slide.
      if (!s.lastUpdate.time && (nav.no() !== 1 || nav.clicks() !== 0)) return;
      // An older move than the one we follow (another presenter window answering a late window's hello), or than our own
      // last move.
      if (s.lastUpdate.time < followed || s.lastUpdate.time < sync.ownMoveTime) return;
      followed = s.lastUpdate.time;
      const page = Math.min(s.page, nav.total);
      if (page === nav.no() && s.clicks === nav.clicks()) return;
      applied = `${page}:${s.clicks}`;
      appliedFrom = s.lastUpdate.type === 'viewer' ? s.lastUpdate.id : '';
      const before = nav.clicks();
      nav.jump(page, s.clicks);
      // A step past the slide's last click, while this window already sits at the last one: the click does not change, so the
      // effect above does not run.
      if (page === nav.no() && nav.ready() && nav.clicks() === before && before !== s.clicks) {
        applied = appliedFrom = '';
        report();
      }
    });
  });

  // A window that opens later asks where we are; presenters answer (every window answers with the timer, see
  // sync-state.ts). A second presenter asks as well: it ignores the other presenter's position, but takes the timer.
  if (nav.isPresenter) inject(DestroyRef).onDestroy(sync.onHello(() => send(undefined, true)));
  sync.sendHello();
}
