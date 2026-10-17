// Slows down guessing of the `--remote` password and keeps logins short.
//   createLoginGuard: per client address. The first few wrong passwords only cost the usual delay; from the fifth the client
//   is locked out for 10 s, then twice as long after each further failure, up to 15 minutes. A right password clears it.
//   While a client is locked the password is not even compared, so many guesses sent at once do not help.
//   createSessions: what a login cookie holds. Every login gets its own random value with an expiry (8 hours), instead of
//   one secret that is the same for everyone and for the whole run. With a password the value is signed with it
//   (`id.expiry.signature`), so the logins survive a restart of the dev server with the same password: the devices in the
//   room are not all asked for it again. Without one (a local session needs no login) the server remembers the values.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_HOURS = 8;

export function createLoginGuard({
  now = Date.now,
  free = 5,
  baseMs = 10_000,
  maxMs = 15 * 60_000,
  maxClients = 1000,
} = {}) {
  const clients = new Map(); // address -> { fails, until }
  return {
    /** Milliseconds this client must still wait; 0 when it may try. */
    wait(address) {
      const until = clients.get(address)?.until ?? 0;
      return Math.max(0, until - now());
    },
    fail(address) {
      const entry = clients.get(address) ?? { fails: 0, until: 0 };
      entry.fails++;
      if (entry.fails >= free)
        entry.until = now() + Math.min(maxMs, baseMs * 2 ** (entry.fails - free));
      clients.delete(address); // re-insert: the map keeps the most recent clients last
      clients.set(address, entry);
      while (clients.size > maxClients) clients.delete(clients.keys().next().value);
    },
    ok(address) {
      clients.delete(address);
    },
    size: () => clients.size,
  };
}

export function createSessions({
  now = Date.now,
  ttlMs = SESSION_HOURS * 3_600_000,
  secret = '',
} = {}) {
  const maxAgeSeconds = Math.floor(ttlMs / 1000);
  if (secret) {
    const key = createHash('sha256').update(`slide-ng-session\0${secret}`).digest();
    const sign = (text) => createHmac('sha256', key).update(text).digest('base64url');
    return {
      issue() {
        const body = `${randomBytes(24).toString('hex')}.${now() + ttlMs}`;
        return `${body}.${sign(body)}`;
      },
      has(value) {
        const m =
          typeof value === 'string' && /^([0-9a-f]{48}\.(\d{1,16}))\.([\w-]{43})$/.exec(value);
        if (!m || Number(m[2]) <= now()) return false;
        const a = Buffer.from(m[3]),
          b = Buffer.from(sign(m[1]));
        return a.length === b.length && timingSafeEqual(a, b);
      },
      maxAgeSeconds,
    };
  }
  const sessions = new Map(); // cookie value -> expiry time
  return {
    /** A new login: returns the value for the cookie. */
    issue() {
      for (const [id, expires] of sessions) if (expires <= now()) sessions.delete(id);
      const id = randomBytes(24).toString('hex');
      sessions.set(id, now() + ttlMs);
      return id;
    },
    has(id) {
      const expires = typeof id === 'string' ? sessions.get(id) : undefined;
      return expires !== undefined && expires > now();
    },
    maxAgeSeconds,
  };
}
