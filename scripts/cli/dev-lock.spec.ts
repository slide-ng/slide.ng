// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkPortFree, takeDevLock } from './dev-lock.mjs';

const toolDir = () => join(mkdtempSync(join(tmpdir(), 'devlock-')), '.slide-ng');

describe('takeDevLock', () => {
  it('refuses while another running dev server holds the lock, and names it', () => {
    const dir = toolDir();
    takeDevLock(dir, 4230);
    expect(JSON.parse(readFileSync(join(dir, 'dev.lock'), 'utf8')).pid).toBe(process.pid);
    writeFileSync(join(dir, 'dev.lock'), JSON.stringify({ pid: process.ppid, port: 4231 }));
    expect(() => takeDevLock(dir, 4232)).toThrow(/already runs for this deck .*port 4231/);
  });
  it('takes over the lock of a dev server that is gone', () => {
    const dir = toolDir();
    const gone = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], {
      encoding: 'utf8',
    });
    takeDevLock(dir, 4230);
    writeFileSync(join(dir, 'dev.lock'), JSON.stringify({ pid: +gone.stdout.trim(), port: 1 }));
    expect(() => takeDevLock(dir, 4233)).not.toThrow();
    expect(existsSync(join(dir, 'dev.lock'))).toBe(true);
  });
});

describe('checkPortFree', () => {
  it('fails with a clear message when the port is taken', async () => {
    const server = createServer();
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const port = (server.address() as { port: number }).port;
    await expect(checkPortFree(port)).rejects.toThrow(`port ${port} is in use`);
    server.close();
    await new Promise((r) => setTimeout(r, 50));
    await expect(checkPortFree(port)).resolves.toBeUndefined();
  });
});
