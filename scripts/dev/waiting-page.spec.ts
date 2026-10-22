import { request } from 'node:http';
import { createServer } from 'node:net';
import { devServerHostAllowed, startWaitingPage, waitingHtml } from './waiting-page.mjs';

const freePort = () =>
  new Promise<number>((done) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => done(port));
    });
  });

describe('devServerHostAllowed', () => {
  it("answers the addresses Vite's Host check answers, and no others", () => {
    const ok = [
      'localhost:4230',
      'localhost',
      'deck.localhost:4230',
      '127.0.0.1:4230',
      '192.168.1.5:4230',
      '[::1]:4230',
      '[fe80::1]',
    ];
    expect(ok.filter((host) => !devServerHostAllowed(host, undefined))).toEqual([]);
    const refused = ['LOCALHOST:4230', 'evil.example:4230', 'my-laptop.local:4230', '[nope]'];
    expect(refused.filter((host) => devServerHostAllowed(host, undefined))).toEqual([]);
    expect(devServerHostAllowed('my-laptop.local:4230', 'my-laptop.local')).toBe(true);
  });
});

describe('the waiting page', () => {
  it('escapes the error, and leaves it out in remote mode', () => {
    expect(waitingHtml('<foo-barr> is not known')).toContain('&lt;foo-barr&gt; is not known');
    expect(waitingHtml('/home/me/deck/slides.md', { remote: true })).not.toContain('/home/me');
  });
  it('answers every address with the error, and steps aside for the secret only', async () => {
    const port = await freePort();
    let released = false;
    const page = startWaitingPage({
      port,
      host: '127.0.0.1',
      secret: 's3cret',
      onRelease: () => (released = true),
    });
    page.show('NG8001: oops');
    await new Promise((r) => setTimeout(r, 100));
    const res = await fetch(`http://127.0.0.1:${port}/3`);
    expect(res.status).toBe(503);
    expect(res.headers.get('x-slide-ng-waiting')).toBe('1');
    expect(await res.text()).toContain('NG8001: oops');
    // A page reached through another name (DNS rebinding) gets nothing.
    const rebound = await new Promise<number>((done, fail) =>
      request(
        { host: '127.0.0.1', port, path: '/', headers: { host: `evil.example:${port}` } },
        (r) => {
          r.resume();
          done(r.statusCode ?? 0);
        },
      )
        .on('error', fail)
        .end(),
    );
    expect(rebound).toBe(403);
    // The page's own polling gets 200, so the console shows no error every second.
    const poll = await fetch(`http://127.0.0.1:${port}/3`, { headers: { 'x-slide-ng-poll': '1' } });
    expect(poll.status).toBe(200);
    expect(poll.headers.get('x-slide-ng-waiting')).toBe('1');
    const wrong = await fetch(`http://127.0.0.1:${port}/__slide-ng-release`, {
      method: 'POST',
      headers: { 'x-slide-ng-wait': 'nope' },
    });
    expect(wrong.status).toBe(403);
    const right = await fetch(`http://127.0.0.1:${port}/__slide-ng-release`, {
      method: 'POST',
      headers: { 'x-slide-ng-wait': 's3cret' },
    });
    expect(right.status).toBe(200);
    expect(released).toBe(true);
    expect(page.closed).toBe(true);
  });
});
