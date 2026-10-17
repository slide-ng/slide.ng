import { createLoginGuard, createSessions } from './login-guard.mjs';

describe('createLoginGuard', () => {
  let t = 0;
  const guard = () => createLoginGuard({ now: () => t });
  beforeEach(() => (t = 1_000_000));

  it('lets a client try freely a few times', () => {
    const g = guard();
    for (let i = 0; i < 4; i++) {
      expect(g.wait('1.1.1.1')).toBe(0);
      g.fail('1.1.1.1');
    }
    expect(g.wait('1.1.1.1')).toBe(0);
  });
  it('locks a client after 5 wrong tries, and the lock doubles up to a limit', () => {
    const g = guard();
    for (let i = 0; i < 5; i++) g.fail('1.1.1.1');
    expect(g.wait('1.1.1.1')).toBe(10_000);
    t += 10_000;
    expect(g.wait('1.1.1.1')).toBe(0);
    g.fail('1.1.1.1'); // 6th
    expect(g.wait('1.1.1.1')).toBe(20_000);
    for (let i = 0; i < 20; i++) g.fail('1.1.1.1');
    expect(g.wait('1.1.1.1')).toBe(15 * 60_000);
  });
  it('is per client: another address is not affected', () => {
    const g = guard();
    for (let i = 0; i < 9; i++) g.fail('1.1.1.1');
    expect(g.wait('2.2.2.2')).toBe(0);
  });
  it('forgets a client after a right password', () => {
    const g = guard();
    for (let i = 0; i < 4; i++) g.fail('1.1.1.1');
    g.ok('1.1.1.1');
    g.fail('1.1.1.1');
    expect(g.wait('1.1.1.1')).toBe(0);
  });
  it('keeps its memory bounded', () => {
    const g = createLoginGuard({ now: () => t, maxClients: 50 });
    for (let i = 0; i < 500; i++) g.fail(`10.0.${i >> 8}.${i & 255}`);
    expect(g.size()).toBeLessThanOrEqual(50);
  });
});

describe('createSessions', () => {
  it('knows the logins it made, each different, until they run out', () => {
    let t = 0;
    const s = createSessions({ now: () => t, ttlMs: 1000 });
    const a = s.issue();
    const b = s.issue();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(s.has(a)).toBe(true);
    expect(s.has('nope')).toBe(false);
    expect(s.has(undefined)).toBe(false);
    t = 1001;
    expect(s.has(a)).toBe(false);
  });
  it('signs the logins with the password, so a restart with the same password keeps them', () => {
    let t = 0;
    const first = createSessions({ now: () => t, ttlMs: 1000, secret: 'pw' });
    const a = first.issue();
    const again = createSessions({ now: () => t, ttlMs: 1000, secret: 'pw' });
    expect(again.has(a)).toBe(true);
    expect(createSessions({ now: () => t, ttlMs: 1000, secret: 'other' }).has(a)).toBe(false);
    const [id, expires, mac] = a.split('.');
    expect(again.has(`${id}.${Number(expires) + 9999}.${mac}`)).toBe(false); // a longer life is not signed
    expect(again.has(`${'0'.repeat(48)}.${expires}.${mac}`)).toBe(false);
    t = 1001;
    expect(again.has(a)).toBe(false);
  });
});
