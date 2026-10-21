import { Injectable, inject, isDevMode, signal } from '@angular/core';
import { UI_TEXT, uiText } from '../i18n/ui-text';

/** Where the dev companion server answers. The Angular dev server forwards this address to it. */
export const API = '/__slide-ng';

/**
 * The `?password=` of an address: in the query (`/presenter/1?password=x`) or, with `routerMode: hash`, in the query after
 * the `#` (`/#/presenter/1?password=x`). Null when there is none.
 */
export function passwordInAddress(address: { search: string; hash: string }): string | null {
  const inHash = address.hash.indexOf('?');
  return (
    new URLSearchParams(address.search).get('password') ??
    (inHash < 0 ? null : new URLSearchParams(address.hash.slice(inHash + 1)).get('password'))
  );
}

/** The address without its `password` parameter (in the query and in the hash's query). */
export function withoutPassword(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('password');
  const inHash = url.hash.indexOf('?');
  if (inHash >= 0) {
    const query = new URLSearchParams(url.hash.slice(inHash + 1));
    query.delete('password');
    const rest = query.toString();
    url.hash = url.hash.slice(0, inHash) + (rest ? `?${rest}` : '');
  }
  return url.href;
}

// Read when this file loads, before the router's first navigation: a redirect (`/` to `/1`, `#/` to `#/1`) drops the query, and
// the page would ask for the password it was opened with.
const passwordAtStart = typeof location === 'undefined' ? null : passwordInAddress(location);

/**
 * The page's door to the dev companion server (scripts/dev/server.mjs). Only a dev build uses it: in a static
 * build `enabled` is false and nothing is ever requested. It logs in with `?password=` (or asks once), then
 * fetches the session token that every write needs.
 */
@Injectable({ providedIn: 'root' })
export class DevApi {
  readonly enabled = isDevMode();
  /** The server wants a password and we do not have it: writes and device sync stay off. */
  readonly locked = signal(false);
  private session?: Promise<string | null>;
  private text = inject(UI_TEXT);

  /** The session token, or null when there is no companion server (or no access). Asked once per page. */
  token(): Promise<string | null> {
    if (!this.enabled) return Promise.resolve(null);
    return (this.session ??= this.connect());
  }

  private async connect(): Promise<string | null> {
    try {
      const fromUrl = passwordAtStart ?? passwordInAddress(location);
      if (fromUrl) {
        await this.login(fromUrl);
        this.forgetPasswordInUrl();
      }
      let res = await fetch(`${API}/session`, { credentials: 'same-origin' });
      if (res.status === 401) {
        const typed = window.prompt(uiText(this.text, 'dev.password'));
        if (typed && (await this.login(typed)))
          res = await fetch(`${API}/session`, { credentials: 'same-origin' });
      }
      if (res.status === 401) this.locked.set(true);
      return res.ok ? ((await res.json()) as { token: string }).token : null;
    } catch {
      return null; // no companion server (a plain `ng serve`): the deck works, it just cannot write
    }
  }

  private async login(password: string): Promise<boolean> {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.ok;
  }

  // The password should not stay in the address bar, the history or a shared link.
  private forgetPasswordInUrl() {
    const url = withoutPassword(location.href);
    if (url !== location.href) history.replaceState(history.state, '', url);
  }

  /** POST or PUT a JSON body. Resolves true when the server accepted it. */
  async send(method: 'POST' | 'PUT', path: string, body: unknown): Promise<boolean> {
    return (await this.request(method, path, body)) === 200;
  }

  /** The same, with the HTTP status (0 when the request could not be made). */
  async request(method: 'POST' | 'PUT', path: string, body: unknown): Promise<number> {
    const token = await this.token();
    if (!token) return 0;
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        credentials: 'same-origin',
        body: JSON.stringify(body),
        headers: { 'content-type': 'application/json', 'x-slide-ng-token': token },
      });
      return res.status;
    } catch {
      return 0;
    }
  }

  async get<T>(path: string): Promise<T | null> {
    const token = await this.token();
    if (!token) return null;
    try {
      const res = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        headers: { 'x-slide-ng-token': token },
      });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  }
}
