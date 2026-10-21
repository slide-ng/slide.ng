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
