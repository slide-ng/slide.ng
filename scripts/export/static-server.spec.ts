import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRange, sendFile, serveDirectory } from './static-server.mjs';

describe('sendFile', () => {
  it('answers 500 instead of crashing when the file is gone', async () => {
    const server = http.createServer((_req, res) => sendFile('/no/such/file.txt', res));
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as { port: number };
    const res = await fetch(`http://127.0.0.1:${port}/`);
    expect(res.status).toBe(500);
    server.close();
  });
});

describe('parseRange', () => {
  it('reads a start, an end, an open end and a suffix', () => {
    expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=90-500', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
  });
  it('sends the whole file for no header or one it does not serve, refuses a start past the end', () => {
    expect(parseRange(undefined, 100)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 100)).toBeNull();
    expect(parseRange('bytes=-', 100)).toBeNull();
    expect(parseRange('bytes=100-', 100)).toBe('unsatisfiable');
    expect(parseRange('bytes=5-2', 100)).toBe('unsatisfiable');
  });
});

describe('serveDirectory', () => {
  it('answers byte ranges, so a browser can seek a video', async () => {
    const root = mkdtempSync(join(tmpdir(), 'static-server-'));
    writeFileSync(join(root, 'clip.webm'), '0123456789');
    const { origin, close } = await serveDirectory(root);
    try {
      const whole = await fetch(`${origin}/clip.webm`);
      expect(whole.status).toBe(200);
      expect(whole.headers.get('accept-ranges')).toBe('bytes');
      expect(await whole.text()).toBe('0123456789');
      const part = await fetch(`${origin}/clip.webm`, { headers: { range: 'bytes=2-4' } });
      expect(part.status).toBe(206);
      expect(part.headers.get('content-range')).toBe('bytes 2-4/10');
      expect(await part.text()).toBe('234');
      const past = await fetch(`${origin}/clip.webm`, { headers: { range: 'bytes=20-' } });
      expect(past.status).toBe(416);
      expect(past.headers.get('content-range')).toBe('bytes */10');
    } finally {
      await close();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
