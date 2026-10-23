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

/** Whether nothing listens on `port` at `address` (undefined: every address). No such address here (no IPv6) counts as free. */
function freeAt(port, address) {
  return new Promise((done, fail) => {
    const s = createServer();
    s.once('error', (e) =>
      e.code === 'EADDRINUSE'
        ? done(false)
        : e.code === 'EAFNOSUPPORT' || e.code === 'EADDRNOTAVAIL'
          ? done(true)
          : fail(e),
    );
    s.listen(port, address, () => s.close(() => done(true)));
  });
}

/**
 * Whether nothing listens on `port` (on `host`, or on any address). Without a host the loopback addresses are tried too:
 * on macOS a server on 127.0.0.1 does not stop another one from listening on every address, so that test alone would
 * call a taken port free. Errors other than "in use" (no permission) are thrown.
 */
async function portFree(port, host) {
  for (const address of host ? [host] : [undefined, '127.0.0.1', '::1'])
    if (!(await freeAt(port, address))) return false;
  return true;
}

/** The first free port after `port`, trying at most `tries` of them; undefined when none is. */
export async function nextFreePort(port, host, tries = 20) {
  for (let p = port + 1; p <= Math.min(port + tries, 65535); p++)
    if (await portFree(p, host)) return p;
  return undefined;
}

/**
 * The port the dev server listens on: `port` when it is free. When it is taken, the next free one if the port was not asked
 * for with --port (as Slidev does); with --port it throws, naming a free one to try.
 */
export async function choosePort(port, host, given) {
  if (await portFree(port, host)) return port;
  const next = await nextFreePort(port, host);
  if (next && !given) return next;
  throw new Error(
    `port ${port} is in use (another dev server?); ${next ? `try --port ${next}` : 'pick another one with --port'}`,
  );
}

/** Writes the port the dev server ended up on into its lock, so a second dev server on the deck names the right one. */
export function updateLockPort(file, port) {
  writeFileSync(file, JSON.stringify({ pid: process.pid, port }) + '\n');
}
