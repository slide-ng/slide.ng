import { cleanDrawings, cleanShared, initialShared, mergeShared } from './shared-state';

describe('cleanShared', () => {
  it('keeps known keys with the right types', () => {
    const cursor = { x: 10, y: 20, style: 'laser' };
    expect(cleanShared({ page: 3, clicks: 1, clicksTotal: 4, cursor })).toEqual({
      page: 3,
      clicks: 1,
      clicksTotal: 4,
      cursor,
    });
  });

  it('keeps null for the cursor (it means "gone")', () => {
    expect(cleanShared({ cursor: null })).toEqual({ cursor: null });
  });

  it('drops unknown keys and values of the wrong type', () => {
    expect(
      cleanShared({
        page: '3',
        clicks: NaN,
        clicksTotal: -2,
        page2: 1.5,
        evil: 1,
        cursor: { x: 1, y: 2, style: 'bomb' },
      }),
    ).toEqual({});
    expect(cleanShared('nope')).toEqual({});
    expect(cleanShared(null)).toEqual({});
  });

  it('checks the timer and the last update', () => {
    expect(
      cleanShared({ timer: { status: 'running', startedAt: 5, pausedAt: 0 } }).timer?.status,
    ).toBe('running');
    expect(
      cleanShared({ timer: { status: 'flying', startedAt: 5, pausedAt: 0 } }).timer,
    ).toBeUndefined();
    expect(cleanShared({ lastUpdate: { id: 'a', type: 'viewer', time: 1 } }).lastUpdate?.type).toBe(
      'viewer',
    );
    expect(
      cleanShared({ lastUpdate: { id: 'a', type: 'admin', time: 1 } }).lastUpdate,
    ).toBeUndefined();
  });

  it("moves a timer from the sender's clock onto ours", () => {
    // The sender's clock is an hour ahead; the timer has run for a minute there and was paused 10 s ago.
    const hour = 3_600_000;
    const timer = {
      status: 'paused',
      startedAt: 1e9 + hour - 70_000,
      pausedAt: 1e9 + hour - 10_000,
    };
    expect(cleanShared({ timer: { ...timer, sentAt: 1e9 + hour } }, 1e9).timer).toEqual({
      status: 'paused',
      startedAt: 1e9 - 70_000,
      pausedAt: 1e9 - 10_000,
    });
    // Not started and not paused stay 0; without the sender's clock the times are taken as they are.
    expect(
      cleanShared({ timer: { status: 'stopped', startedAt: 0, pausedAt: 0, sentAt: 5 } }, 1e9)
        .timer,
    ).toEqual({ status: 'stopped', startedAt: 0, pausedAt: 0 });
    expect(cleanShared({ timer }, 1e9).timer?.startedAt).toBe(timer.startedAt);
  });

  it("moves the time of a move from the sender's clock onto ours", () => {
    // The sender's clock is an hour behind; it made the move 5 s before it sent it.
    const hour = 3_600_000;
    const update = { id: 'a', type: 'presenter', time: 1e9 - hour - 5000, sentAt: 1e9 - hour };
    expect(cleanShared({ lastUpdate: update }, 1e9).lastUpdate).toEqual({
      id: 'a',
      type: 'presenter',
      time: 1e9 - 5000,
    });
    // A presenter's first position (time 0) stays 0; without the sender's clock the time is taken as it is.
    expect(cleanShared({ lastUpdate: { ...update, time: 0 } }, 1e9).lastUpdate?.time).toBe(0);
    expect(
      cleanShared({ lastUpdate: { id: 'a', type: 'viewer', time: 7 } }, 1e9).lastUpdate?.time,
    ).toBe(7);
  });

  it('cuts a very long id', () => {
    expect(
      cleanShared({ lastUpdate: { id: 'x'.repeat(500), type: 'viewer', time: 1 } }).lastUpdate?.id
        .length,
    ).toBe(64);
  });
});

describe('the timer: the newest change wins', () => {
  it("moves a change's time onto our clock, and drops a junk one", () => {
    const timer = { status: 'stopped', startedAt: 0, pausedAt: 0 };
    expect(cleanShared({ timer: { ...timer, changedAt: 900, sentAt: 1000 } }, 5000).timer).toEqual({
      ...timer,
      changedAt: 4900,
    });
    expect(cleanShared({ timer: { ...timer, changedAt: 'x' } }).timer).toEqual(timer);
  });

  it('a timer changed before the one held is dropped; the rest of the message is taken', () => {
    const reset = { status: 'stopped' as const, startedAt: 0, pausedAt: 0, changedAt: 2000 };
    const state = { ...initialShared(), timer: reset };
    const stale = { status: 'running' as const, startedAt: 1000, pausedAt: 0, changedAt: 1000 };
    expect(mergeShared(state, { timer: stale, clicks: 2 })).toEqual({ ...state, clicks: 2 });
    const newer = { ...stale, changedAt: 3000 };
    expect(mergeShared(state, { timer: newer }).timer).toBe(newer);
    // A timer without a time (never changed) does not replace a changed one; it still fills a fresh window.
    const plain = { status: 'running' as const, startedAt: 1000, pausedAt: 0 };
    expect(mergeShared(state, { timer: plain }).timer).toBe(reset);
    expect(mergeShared(initialShared(), { timer: plain }).timer).toBe(plain);
  });
});

describe('cleanDrawings', () => {
  it('keeps slide numbers with text, including the empty text that means cleared', () => {
    expect(cleanDrawings({ 1: '<path/>', 2: '' })).toEqual({ 1: '<path/>', 2: '' });
  });

  it('drops bad slide numbers, non-text values and huge drawings', () => {
    expect(cleanDrawings({ 0: 'a', '-1': 'b', x: 'c', 3: 5, 4: 'z'.repeat(600_000) })).toEqual({});
  });
});
