// Keeps this window's slide and click in step with the other windows.
// The presenter drives and the audience follows. A viewer on this machine may also drive
// (like Slidev); a viewer on another machine only follows.
import { DestroyRef, computed, effect, inject, untracked } from '@angular/core';
import { Nav } from '../lib/nav';
import { SyncState } from './sync-state';

// Slidev's TRUST_ORIGINS: only these hosts may send navigation as a viewer.
const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

/** A viewer may drive when the page is on this machine: a local host name, or a folder opened from disk (file://). */
export function isLocalPage(loc: Pick<Location, 'protocol' | 'hostname'>): boolean {
  return loc.protocol === 'file:' || LOCAL_HOSTS.includes(loc.hostname);
}

/** Call once, in the constructor of a page that has a Nav (the deck or the presenter). */
export function startNavSync(nav: Nav) {
  const sync = inject(SyncState);
  const type = nav.isPresenter ? 'presenter' : 'viewer';
  const mayShare = nav.isPresenter || isLocalPage(location);
  let applied = ''; // "page:clicks" of the last move that came from outside: it is not sent back
  let appliedFrom = ''; // the window that made it
  let first = true;

  const send = (via?: string) => {
    const d = sync.directions();
    if (!(nav.isPresenter ? d.presenterSend : d.viewerSend) || !mayShare) return;
    sync.patchShared({
      page: nav.no(),
      clicks: nav.clicks(),
      clicksTotal: nav.clicksTotal(),
      lastUpdate: { id: sync.id, type, time: Date.now(), ...(via ? { via } : {}) },
    });
  };
  // After a move from outside that this window could not take as it came (a step past the slide's last click): say where it
  // is, so the sender (MCP's goto_slide) learns the step it took. A window that may not drive only reports it (the others do
  // not follow a report).
  const report = () =>
    mayShare ? send() : sync.reportPosition({ page: nav.no(), clicks: nav.clicks() });

  // Our position changed: tell the others. The very first position of a viewer is not news
  // (a viewer that just opened would drag the presenter back to its own slide).
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
      if (followed) return report();
      send();
    });
  });

  // Someone else moved: follow. Only a new position or a new update counts, not a moving cursor or the timer. The kind of
  // window is part of it: MCP's goto_slide sends one move as a viewer and one as a presenter with the same time, and the
  // second must still be seen when an effect ran between the two.
  const moved = computed(() => {
    const s = sync.shared();
    return `${s.page}:${s.clicks}:${s.lastUpdate?.time}:${s.lastUpdate?.type}`;
  });
  effect(() => {
    moved();
    untracked(() => {
      const s = sync.shared();
      const d = sync.directions();
      if (!(nav.isPresenter ? d.presenterReceive : d.viewerReceive)) return;
      if (!s.lastUpdate || s.lastUpdate.type === type || s.page < 1) return;
      // Our own move: passed on by the presenter, or made by this window while it was the presenter page (the state stays
      // when the window moves from /presenter/3 to /1).
      if (s.lastUpdate.via === sync.id || s.lastUpdate.id === sync.id) return;
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

  // A window that opens later asks where we are; presenters answer (the timer answers too, see presenter/timer.ts). A
  // second presenter asks as well: it ignores the other presenter's position, but takes its running timer.
  if (nav.isPresenter) inject(DestroyRef).onDestroy(sync.onHello(send));
  sync.sendHello();
}
