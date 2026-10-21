import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Nav } from '../lib/nav';
import { firstMoveTime, isLocalPage, startNavSync } from './nav-sync';
import { SYNC_TRANSPORTS, SyncTransport } from './transport';

describe('isLocalPage', () => {
  it('knows the local host names', () => {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]'])
      expect(isLocalPage({ protocol: 'http:', hostname })).toBe(true);
  });

  it('counts a folder opened from disk as local', () => {
    expect(isLocalPage({ protocol: 'file:', hostname: '' })).toBe(true);
  });

  it('does not trust another machine or an empty host name on the web', () => {
    expect(isLocalPage({ protocol: 'https:', hostname: 'talk.example.com' })).toBe(false);
    expect(isLocalPage({ protocol: 'http:', hostname: '192.168.1.5' })).toBe(false);
    expect(isLocalPage({ protocol: 'http:', hostname: '' })).toBe(false);
  });
});

describe('firstMoveTime', () => {
  it('keeps the time of the last move when the page reloads at that move', () => {
    expect(firstMoveTime({ page: 3, clicks: 1, time: 1234 }, 3, 1)).toBe(1234);
  });

  it('is 0 (older than any move) for a new page, another position or junk', () => {
    expect(firstMoveTime(null, 1, 0)).toBe(0);
    expect(firstMoveTime({ page: 3, clicks: 1, time: 1234 }, 1, 0)).toBe(0);
    expect(firstMoveTime({ page: 3, clicks: 1, time: 'x' }, 3, 1)).toBe(0);
    expect(firstMoveTime('nope', 3, 1)).toBe(0);
  });
});

// A viewer window with a fake Nav; `deliver` plays the messages of the other windows.
function viewer() {
  let deliver: (channel: string, data: unknown) => void = () => {};
  const transport: SyncTransport = { send: () => {}, listen: (h) => (deliver = h) };
  TestBed.configureTestingModule({
    providers: [{ provide: SYNC_TRANSPORTS, multi: true, useValue: transport }],
  });
  const no = signal(1),
    clicks = signal(0);
  const nav = {
    isPresenter: false,
    no,
    clicks,
    clicksTotal: signal(0),
    ready: signal(true),
    total: 5,
    jump: (p: number, c: number) => (no.set(p), clicks.set(c)),
  } as unknown as Nav;
  TestBed.runInInjectionContext(() => startNavSync(nav));
  TestBed.tick();
  const move = (id: string, page: number, time: number, sentAt: number) => {
    deliver('shared', { page, clicks: 0, lastUpdate: { id, type: 'presenter', time, sentAt } });
    TestBed.tick();
    return no();
  };
  return { move };
}

describe('startNavSync (a viewer)', () => {
  it("does not go back to a presenter page's first position after it (re)loads", () => {
    const { move } = viewer();
    const now = Date.now();
    expect(move('a', 3, now, now)).toBe(3); // presenter A moves to slide 3
    expect(move('b', 1, 0, now + 10)).toBe(3); // presenter B (re)loads on slide 1: not a move
    expect(move('b', 2, now + 20, now + 20)).toBe(2); // B moves: it leads now
  });

  it('follows a newer move of a presenter whose clock is behind, not an older one of a clock that is ahead', () => {
    const { move } = viewer();
    const now = Date.now(),
      hour = 3_600_000;
    expect(move('a', 3, now + hour, now + hour)).toBe(3); // A's clock is an hour ahead
    expect(move('b', 2, now - hour + 10, now - hour + 10)).toBe(2); // B's clock is an hour behind, moved later
    // A minute on, A answers a late window's hello with its move from before: older, by its own clock too.
    expect(move('a', 3, now + hour, now + hour + 60_000)).toBe(2);
  });
});
