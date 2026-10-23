import { TestBed } from '@angular/core/testing';
import { SyncState } from './sync-state';
import { SYNC_TRANSPORTS, SyncTransport } from './transport';

// A transport that remembers what was sent and lets the test deliver messages.
class FakeTransport implements SyncTransport {
  sent: [string, unknown][] = [];
  deliver: (channel: string, data: unknown) => void = () => {};
  send(channel: string, data: unknown) {
    this.sent.push([channel, data]);
  }
  listen(handler: (channel: string, data: unknown) => void) {
    this.deliver = handler;
  }
}

function setup() {
  const transport = new FakeTransport();
  TestBed.configureTestingModule({
    providers: [{ provide: SYNC_TRANSPORTS, multi: true, useValue: transport }],
  });
  return { transport, sync: TestBed.inject(SyncState) };
}

describe('SyncState', () => {
  it('a local patch changes the signal and goes out on the shared channel', () => {
    const { transport, sync } = setup();
    sync.patchShared({ page: 4 });
    expect(sync.shared().page).toBe(4);
    expect(transport.sent).toEqual([['shared', { page: 4 }]]);
  });

  it('a message from outside changes the signal and is not sent back', () => {
    const { transport, sync } = setup();
    transport.deliver('shared', { page: 7, clicks: 2 });
    expect(sync.shared().page).toBe(7);
    expect(sync.shared().clicks).toBe(2);
    expect(transport.sent).toEqual([]);
  });

  it('takes the sync mode another window chose', () => {
    const { sync } = setup();
    const changed = { ...sync.directions(), viewerSend: false };
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'slidev-sync-directions',
        newValue: JSON.stringify(changed),
      }),
    );
    expect(sync.directions()).toEqual(changed);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'slidev-sync-directions', newValue: '{oops' }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '{}' }));
    expect(sync.directions()).toEqual(changed);
  });

  it('an older move from outside does not overwrite a newer one, but its timer and cursor are taken', () => {
    const { transport, sync } = setup();
    const move = (time: number) => ({ id: 'a', type: 'presenter', time });
    transport.deliver('shared', { page: 3, clicks: 1, clicksTotal: 2, lastUpdate: move(500) });
    const timer = { status: 'running', startedAt: 100, pausedAt: 0 } as const;
    const cursor = { x: 1, y: 2, style: 'laser' } as const;
    transport.deliver('shared', { page: 1, clicks: 0, lastUpdate: move(0), timer, cursor });
    expect(sync.shared()).toMatchObject({ page: 3, clicks: 1, clicksTotal: 2, timer, cursor });
    expect(sync.shared().lastUpdate?.time).toBe(500);
    // As old as the one held (MCP's goto_slide sends two moves with one time): taken.
    transport.deliver('shared', { page: 4, clicks: 0, lastUpdate: move(500) });
    expect(sync.shared().page).toBe(4);
  });

  it('junk from outside is ignored', () => {
    const { transport, sync } = setup();
    transport.deliver('shared', { page: 'x', hacked: true });
    transport.deliver('unknown-channel', { page: 9 });
    expect(sync.shared().page).toBe(0);
  });

  it('drawings travel on their own channel and tell the listeners only when they come from outside', () => {
    const { transport, sync } = setup();
    const heard: unknown[] = [];
    sync.onRemoteDrawings((p) => heard.push(p));
    sync.patchDrawing(2, '<path/>');
    expect(transport.sent).toEqual([['drawings', { 2: '<path/>' }]]);
    expect(heard).toEqual([]);
    transport.deliver('drawings', { 3: '<line/>', bad: 'x' });
    expect(sync.drawings()).toEqual({ 2: '<path/>', 3: '<line/>' });
    expect(heard).toEqual([{ 3: '<line/>' }]);
  });

  it('hello is answered by the handlers of this window', () => {
    const { transport, sync } = setup();
    let answered = 0;
    sync.onHello(() => answered++);
    transport.deliver('hello', {});
    expect(answered).toBe(1);
    sync.sendHello();
    expect(transport.sent).toEqual([['hello', {}]]);
  });

  it("a timer goes out with this device's clock", () => {
    const { transport, sync } = setup();
    const timer = { status: 'running' as const, startedAt: Date.now() - 5000, pausedAt: 0 };
    sync.patchShared({ timer });
    expect(sync.shared().timer).toEqual(timer);
    const sent = transport.sent[0][1] as { timer: { sentAt: number } };
    expect(sent.timer).toEqual({ ...timer, sentAt: expect.any(Number) });
    expect(Math.abs(sent.timer.sentAt - Date.now())).toBeLessThan(1000);
  });

  it("a move goes out with this device's clock, and stays without it here", () => {
    const { transport, sync } = setup();
    const lastUpdate = { id: sync.id, type: 'presenter' as const, time: Date.now() - 5000 };
    sync.patchShared({ page: 2, lastUpdate });
    expect(sync.shared().lastUpdate).toEqual(lastUpdate);
    expect(transport.sent).toEqual([
      ['shared', { page: 2, lastUpdate: { ...lastUpdate, sentAt: expect.any(Number) } }],
    ]);
  });

  it('every window answers a hello with a running or paused timer, not with a stopped one', () => {
    const { transport, sync } = setup();
    transport.deliver('hello', {});
    expect(transport.sent).toEqual([]);
    transport.deliver('shared', {
      timer: { status: 'running', startedAt: Date.now() - 60_000, pausedAt: 0 },
    });
    expect(sync.shared().timer.status).toBe('running');
    transport.deliver('hello', {});
    expect(transport.sent.map(([channel, data]) => [channel, Object.keys(data as object)])).toEqual(
      [['shared', ['timer']]],
    );
  });

  it('a hello is answered with a reset too, so a tab that comes back with an older timer takes it', () => {
    const { transport, sync } = setup();
    const now = Date.now();
    sync.patchShared({ timer: { status: 'stopped', startedAt: 0, pausedAt: 0, changedAt: now } });
    transport.sent.length = 0;
    transport.deliver('hello', {});
    expect(transport.sent.map(([channel, data]) => [channel, Object.keys(data as object)])).toEqual(
      [['shared', ['timer']]],
    );
    // The older running timer that tab sends is not taken.
    transport.deliver('shared', {
      timer: { status: 'running', startedAt: now - 60_000, pausedAt: 0, changedAt: now - 60_000 },
    });
    expect(sync.shared().timer.status).toBe('stopped');
  });

  it('a handler that was removed hears nothing more', () => {
    const { transport, sync } = setup();
    let hello = 0;
    const heard: unknown[] = [];
    const stopHello = sync.onHello(() => hello++);
    const stopDrawings = sync.onRemoteDrawings((p) => heard.push(p));
    stopHello();
    stopDrawings();
    transport.deliver('hello', {});
    transport.deliver('drawings', { 1: '<path/>' });
    expect(hello).toBe(0);
    expect(heard).toEqual([]);
  });

  it('sends through every transport that is provided', () => {
    const a = new FakeTransport(),
      b = new FakeTransport();
    TestBed.configureTestingModule({
      providers: [
        { provide: SYNC_TRANSPORTS, multi: true, useValue: a },
        { provide: SYNC_TRANSPORTS, multi: true, useValue: b },
      ],
    });
    TestBed.inject(SyncState).patchShared({ clicks: 1 });
    expect(a.sent.length + b.sent.length).toBe(2);
  });
});
