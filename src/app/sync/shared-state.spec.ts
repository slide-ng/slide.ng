import { cleanDrawings, cleanShared } from './shared-state';

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

  it('cuts a very long id', () => {
    expect(
      cleanShared({ lastUpdate: { id: 'x'.repeat(500), type: 'viewer', time: 1 } }).lastUpdate?.id
        .length,
    ).toBe(64);
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
