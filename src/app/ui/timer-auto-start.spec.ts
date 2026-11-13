import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Nav } from '../lib/nav';
import { Timer } from '../presenter/timer';
import { SYNC_TRANSPORTS, SyncTransport } from '../sync/transport';
import { autoStartTimer } from './timer-auto-start';
import { TimerPrefs } from './timer-prefs';

describe('autoStartTimer', () => {
  const no = signal(3);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    no.set(3);
    const transport: SyncTransport = { send: () => {}, listen: () => {} };
    TestBed.configureTestingModule({
      providers: [
        { provide: SYNC_TRANSPORTS, multi: true, useValue: transport },
        { provide: Nav, useValue: { no } },
      ],
    });
    TestBed.inject(TimerPrefs).setStart('3');
    runInInjectionContext(TestBed.inject(Injector), autoStartTimer);
    TestBed.tick();
  });

  it('starts the timer when the deck moves to the slide, not when a page opens on it', () => {
    const timer = TestBed.inject(Timer);
    expect(timer.status()).toBe('stopped');
    no.set(2);
    TestBed.tick();
    expect(timer.status()).toBe('stopped');
    no.set(3);
    TestBed.tick();
    expect(timer.status()).toBe('running');
  });

  it('leaves a reset on that slide alone, and does nothing when no slide is set', () => {
    const timer = TestBed.inject(Timer);
    no.set(2);
    TestBed.tick();
    no.set(3);
    TestBed.tick();
    timer.reset();
    TestBed.tick();
    expect(timer.status()).toBe('stopped');
    TestBed.inject(TimerPrefs).setStart('');
    no.set(2);
    TestBed.tick();
    no.set(3);
    TestBed.tick();
    expect(timer.status()).toBe('stopped');
  });
});
