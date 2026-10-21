import { createServer } from 'node:net';
import { startWaitingPage, waitingHtml } from './waiting-page.mjs';

const freePort = () =>
  new Promise<number>((done) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => done(port));
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
