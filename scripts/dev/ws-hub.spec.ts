// @vitest-environment node
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket } from 'ws';
import { createHub, keepTimer, keptTimer } from './ws-hub.mjs';

describe('keptTimer', () => {
  it("moves the sender's clock on by the time the hub kept the timer", () => {
    const timer = { status: 'running', startedAt: 1000, pausedAt: 0, sentAt: 5000 };
    expect(keptTimer({ timer, at: 20_000 }, 23_000)).toEqual({ ...timer, sentAt: 8000 });
  });
  it('gives nothing for a stopped timer or none', () => {
    expect(keptTimer({ timer: { status: 'stopped', startedAt: 0, pausedAt: 0 }, at: 1 }, 2)).toBe(
      null,
    );
    expect(keptTimer(null, 2)).toBe(null);
  });
});

describe('keepTimer', () => {
  it('keeps the newer change, by the hub clock, so a tab that comes back does not undo a reset', () => {
    // Sent by a clock an hour behind the hub, changed at 10 s on the hub's clock.
    const hour = 3_600_000;
    const reset = {
      status: 'stopped',
      startedAt: 0,
      pausedAt: 0,
      changedAt: 10_000 - hour,
      sentAt: 11_000 - hour,
    };
    const kept = keepTimer(null, reset, 11_000);
    // A tab comes back at 20 s with the timer it kept: started at 5 s by the hub's clock, so older than the reset.
    const stale = {
      status: 'running',
      startedAt: 5000,
      pausedAt: 0,
      changedAt: 5000,
      sentAt: 20_000,
    };
    expect(keepTimer(kept, stale, 20_000)).toBe(kept);
    expect(keptTimer(kept, 30_000)).toEqual({ ...reset, sentAt: 30_000 - hour });
    // A newer change, or a timer without a time, replaces it.
    const newer = { ...stale, changedAt: 15_000 };
    expect(keepTimer(kept, newer, 20_000).timer).toBe(newer);
    const old = { status: 'running', startedAt: 5, pausedAt: 0 };
    expect(keepTimer(kept, old, 20_000).timer).toBe(old);
  });
  it('does not answer with a stopped timer that was never changed', () => {
    expect(keptTimer(keepTimer(null, { status: 'stopped', startedAt: 0, pausedAt: 0 }, 1), 2)).toBe(
      null,
    );
  });
});

describe('createHub', () => {
  it('answers a hello with the last running timer, after the window that sent it is gone', async () => {
    const hub = createHub();
    const server = createServer();
    server.on('upgrade', (req, socket, head) =>
      hub.handleUpgrade(req, socket, head, (ws) => hub.emit('connection', ws, req)),
    );
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    const url = `ws://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const connect = () =>
      new Promise<WebSocket>((done) => {
        const ws = new WebSocket(url);
        ws.on('open', () => done(ws));
      });
    const timer = { status: 'running', startedAt: 1000, pausedAt: 0, sentAt: Date.now() };
    const first = await connect();
    first.send(JSON.stringify({ channel: 'shared', data: { page: 2, timer } }));
    await new Promise((done) => setTimeout(done, 100));
    first.close();
    const later = await connect();
    const answer = new Promise<any>((done) =>
      later.once('message', (m) => done(JSON.parse(m.toString()))),
    );
    later.send(JSON.stringify({ channel: 'hello', data: {} }));
    const got = await answer;
    expect(got.channel).toBe('shared');
    expect(Object.keys(got.data)).toEqual(['timer']);
    expect(got.data.timer.startedAt).toBe(1000);
    expect(got.data.timer.sentAt).toBeGreaterThanOrEqual(timer.sentAt + 50);
    later.close();
    hub.close();
    server.close();
  });
});
