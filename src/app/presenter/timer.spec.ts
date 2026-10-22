import { TestBed } from '@angular/core/testing';
import { SYNC_TRANSPORTS, SyncTransport } from '../sync/transport';
import { Timer, clockParts, parseDuration, passedMs } from './timer';

describe('parseDuration', () => {
  it('reads minutes, hours and seconds', () => {
    expect(parseDuration('30min')).toBe(1800);
    expect(parseDuration('1h30min')).toBe(5400);
    expect(parseDuration('90s')).toBe(90);
    expect(parseDuration('1.5h')).toBe(5400);
    expect(parseDuration(45)).toBe(2700);
    expect(parseDuration('20')).toBe(1200);
  });
  it('falls back to 30 minutes', () => {
    expect(parseDuration(undefined)).toBe(1800);
    expect(parseDuration('soon')).toBe(1800);
    expect(parseDuration('0min')).toBe(1800);
  });
});

describe('passedMs', () => {
  it('is 0 when stopped, grows while running and stays still while paused', () => {
    expect(passedMs({ status: 'stopped', startedAt: 0, pausedAt: 0 }, 5000)).toBe(0);
    expect(passedMs({ status: 'running', startedAt: 1000, pausedAt: 0 }, 5000)).toBe(4000);
    expect(passedMs({ status: 'paused', startedAt: 1000, pausedAt: 3000 }, 9000)).toBe(2000);
  });
});

describe('clockParts', () => {
  const running = { status: 'running' as const, startedAt: 1000, pausedAt: 0 };
  it('a stopwatch that has not started shows dashes', () => {
    expect(
      clockParts('stopwatch', 600, { status: 'stopped', startedAt: 0, pausedAt: 0 }, 5000),
    ).toEqual({ h: '', m: '-', s: '--' });
  });
  it('a stopwatch counts up', () => {
    expect(clockParts('stopwatch', 600, running, 1000 + 65_000)).toEqual({
      h: '',
      m: '1',
      s: '05',
    });
    expect(clockParts('stopwatch', 600, running, 1000 + 3_725_000)).toEqual({
      h: '1',
      m: '02',
      s: '05',
    });
  });
  it('a countdown counts down from the duration, also before it starts, and goes negative at the end', () => {
    expect(
      clockParts('countdown', 600, { status: 'stopped', startedAt: 0, pausedAt: 0 }, 0),
    ).toEqual({ h: '', m: '10', s: '00' });
    expect(clockParts('countdown', 600, running, 1000 + 60_000)).toEqual({
      h: '',
      m: '9',
      s: '00',
    });
    expect(clockParts('countdown', 60, running, 1000 + 90_000)).toEqual({
      h: '',
      m: '-0',
      s: '30',
    });
    // more than an hour over: the minus is in front of the hours
    expect(clockParts('countdown', 2700, running, 1000 + 125 * 60_000 + 1000)).toEqual({
      h: '-1',
      m: '20',
      s: '01',
    });
  });
});

describe('Timer', () => {
  it('keeps a timer that came from another window for the tab, so a restart of the dev server does not lose it', () => {
    sessionStorage.clear();
    let deliver: (channel: string, data: unknown) => void = () => {};
    const transport: SyncTransport = { send: () => {}, listen: (h) => (deliver = h) };
    TestBed.configureTestingModule({
      providers: [{ provide: SYNC_TRANSPORTS, multi: true, useValue: transport }],
    });
    const timer = TestBed.inject(Timer);
    TestBed.tick();
    const startedAt = Date.now() - 60_000;
    deliver('shared', { timer: { status: 'running', startedAt, pausedAt: 0 } });
    TestBed.tick();
    expect(timer.status()).toBe('running');
    expect(JSON.parse(sessionStorage.getItem('slide-ng-timer') ?? 'null')).toEqual({
      status: 'running',
      startedAt,
      pausedAt: 0,
    });
    // A reset from another window is kept too: a reload must not bring the old timer back.
    deliver('shared', { timer: { status: 'stopped', startedAt: 0, pausedAt: 0 } });
    TestBed.tick();
    expect(JSON.parse(sessionStorage.getItem('slide-ng-timer') ?? 'null').status).toBe('stopped');
  });

  it('a tab that comes back does not bring its kept timer back over a newer reset of another window', () => {
    sessionStorage.clear();
    const now = Date.now();
    const kept = {
      status: 'running',
      startedAt: now - 60_000,
      pausedAt: 0,
      changedAt: now - 60_000,
    };
    sessionStorage.setItem('slide-ng-timer', JSON.stringify(kept));
    let deliver: (channel: string, data: unknown) => void = () => {};
    const sent: [string, unknown][] = [];
    const transport: SyncTransport = {
      send: (channel, data) => sent.push([channel, data]),
      listen: (h) => (deliver = h),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SYNC_TRANSPORTS, multi: true, useValue: transport }],
    });
    const timer = TestBed.inject(Timer);
    TestBed.tick();
    expect(timer.status()).toBe('running'); // nothing newer known yet: the kept timer is back
    // Another window reset it while this tab was away; it answers this tab's hello with the reset.
    deliver('shared', {
      timer: { status: 'stopped', startedAt: 0, pausedAt: 0, changedAt: now - 1000 },
    });
    TestBed.tick();
    expect(timer.status()).toBe('stopped');
    expect(JSON.parse(sessionStorage.getItem('slide-ng-timer') ?? 'null').status).toBe('stopped');
    // A change made here gets its time.
    timer.start();
    const last = sent.at(-1)?.[1] as { timer: { changedAt: number } };
    expect(Math.abs(last.timer.changedAt - Date.now())).toBeLessThan(1000);
  });
});
