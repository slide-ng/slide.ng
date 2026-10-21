// One deck runs one dev server: a second one would replace the working copy of the app (.slide-ng/app) under the first.
// Both checks run before anything is written.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM'; // there, but someone else's
  }
};

/**
 * Takes `<toolDir>/dev.lock` for this process, or throws when a running dev server holds it. A lock left by a server that
 * is gone (killed, crashed) is taken over. The lock is removed when this process exits.
 */
export function takeDevLock(toolDir, port) {
  const file = join(toolDir, 'dev.lock');
  mkdirSync(toolDir, { recursive: true });
  const text = JSON.stringify({ pid: process.pid, port }) + '\n';
  for (let tries = 0; tries < 2; tries++) {
    try {
      writeFileSync(file, text, { flag: 'wx' });
      process.on('exit', () => {
        try {
          if (JSON.parse(readFileSync(file, 'utf8')).pid === process.pid) rmSync(file);
        } catch {
          /* gone already */
        }
      });
      return file;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    let held = null;
    try {
      held = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      /* half written or unreadable: treated as stale */
    }
    if (held?.pid && held.pid !== process.pid && alive(held.pid))
      throw new Error(
        `a dev server already runs for this deck (process ${held.pid}${held.port ? `, port ${held.port}` : ''}); one deck runs one dev server, so stop that one first (its working copy in ${toolDir} would be replaced)`,
      );
    rmSync(file, { force: true });
  }
  throw new Error(`could not take ${file}`);
}

/** Throws when something already listens on `port` (on `host`, or on any address). */
export function checkPortFree(port, host) {
  return new Promise((done, fail) => {
    const s = createServer();
    s.once('error', (e) =>
      fail(
        e.code === 'EADDRINUSE'
          ? new Error(`port ${port} is in use (another dev server?); pick another one with --port`)
          : e,
      ),
    );
    s.listen(port, host, () => s.close(() => done()));
  });
}
