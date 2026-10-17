// The settings of one dev session. `scripts/dev.mjs` puts them into the environment of the companion
// server; nothing here comes from a web request.
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { createLoginGuard, createSessions } from './login-guard.mjs';

export const randomSecret = () => randomBytes(24).toString('hex');

/** A password for `--remote` when the person gave none: 24 random characters (144 bits), URL safe. */
export const randomPassword = () => randomBytes(18).toString('base64url');

export function readConfig(env, cwd = process.cwd()) {
  // There is no passwordless remote mode: the command line always makes (or asks for) one.
  if (env.SLIDE_NG_REMOTE === '1' && !env.SLIDE_NG_PASSWORD)
    throw new Error('remote mode needs a password (SLIDE_NG_PASSWORD)');
  const entry = resolve(cwd, env.SLIDES_FILE ?? 'slides.md');
  return {
    /** The folder of the deck: nothing outside it is ever written. `.slide-ng/` lives here too. */
    root: dirname(entry),
    entry,
    /** Sent with every write and WebSocket; a page learns it from /session. */
    token: env.SLIDE_NG_TOKEN || randomSecret(),
    /** `--remote` password; empty only without --remote. */
    password: env.SLIDE_NG_PASSWORD ?? '',
    /** The logins that are valid (one random cookie value each, 8 hours, signed with the password) and the limit on wrong passwords. */
    sessions: createSessions({ secret: env.SLIDE_NG_PASSWORD ?? '' }),
    loginGuard: createLoginGuard(),
    remote: env.SLIDE_NG_REMOTE === '1',
    /** Host names the machine is reached by (besides localhost and addresses). */
    hostnames: (env.SLIDE_NG_HOSTNAMES ?? '').split(',').filter(Boolean),
    port: Number(env.SLIDE_NG_DEV_PORT) || 0,
  };
}
