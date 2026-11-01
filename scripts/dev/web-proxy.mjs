import { createServer } from 'node:http';
import { lookup as lookupEach } from 'node:dns';
import { lookup } from 'node:dns/promises';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { Agent, fetch as undiciFetch } from 'undici';
import { createCookieJar, sameSiteContext } from './cookie-jar.mjs';

export const SHIM_PATH = '/__slide-ng-web/shim.js';
export const COOKIE_PATH = '/__slide-ng-web/cookie';
let shimSource = null;
const readShim = () =>
  (shimSource ??= readFileSync(new URL('./web-proxy-shim.js', import.meta.url), 'utf8'));

export function proxyHost(url, key, port) {
  const u = new URL(url);
  const scheme = u.protocol.slice(0, -1);
  const label = u.port ? `${scheme}-${u.port}` : scheme;
  return `${u.hostname}.${label}.${key}.localhost:${port}`;
}

export function toProxy(url, key, port) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
  if (u.hostname.endsWith(`.${key}.localhost`)) return u.href;
  return `http://${proxyHost(u.href, key, port)}${u.pathname}${u.search}${u.hash}`;
}

export function realOrigin(host, key) {
  const m = new RegExp(
    `^(.+)\\.(https?)(?:-(\\d{1,5}))?\\.${key}\\.localhost(?::\\d{1,5})?$`,
    'i',
  ).exec(String(host ?? ''));
  if (!m || !/^[a-z\d.-]+$/i.test(m[1]) || (m[3] && (+m[3] < 1 || +m[3] > 65535))) return null;
  return `${m[2].toLowerCase()}://${m[1].toLowerCase()}${m[3] ? `:${m[3]}` : ''}`;
}

export function toReal(url, key) {
  try {
    const u = new URL(url);
    const origin = realOrigin(u.host, key);
    return origin ? `${origin}${u.pathname}${u.search}${u.hash}` : url;
  } catch {
    return url;
  }
}

const ABSOLUTE = /^(?:https?:)?\/\//i;

/**
 * @param {string} html
 * @param {{ key: string, port: number, base: string, cookie?: string }} options
 */
export function rewriteHtml(html, { key, port, base, cookie }) {
  const map = (value) => {
    const raw = value.trim();
    if (!ABSOLUTE.test(raw)) return value;
    try {
      return toProxy(new URL(raw, base).href, key, port);
    } catch {
      return value;
    }
  };
  const mirror =
    typeof cookie === 'string'
      ? `<script>self.__slideNgCookie=${JSON.stringify(cookie).replace(/</g, '\\u003c')}</script>`
      : '';
  const shim = `${mirror}<script src="${SHIM_PATH}"></script>`;
  const tag = (text) =>
    /^<meta\b/i.test(text) && /http-equiv\s*=\s*["']?content-security-policy/i.test(text)
      ? ''
      : text
          .replace(/\s(integrity|nonce)\s*=\s*("[^"]*"|'[^']*')/gi, '')
          .replace(
            /(\s(?:href|src|action|poster|data|formaction)\s*=\s*)(["'])(.*?)\2/gi,
            (_, attr, q, value) => `${attr}${q}${map(value)}${q}`,
          )
          .replace(/(\ssrcset\s*=\s*)(["'])(.*?)\2/gi, (_, attr, q, value) => {
            const set = value.replace(/(^|,\s*)(\S+)/g, (_m, sep, url) => `${sep}${map(url)}`);
            return `${attr}${q}${set}${q}`;
          })
          .replace(/(\starget\s*=\s*)(["']?)_(top|parent)\2/gi, '$1$2_self$2');
  let out = html.replace(
    /(<(script|style|textarea|title)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)|<!--[\s\S]*?-->|<[a-z][^>"']*(?:(?:"[^">]*"|'[^'>]*')[^>"']*)*>/gi,
    (whole, open, name, body, close) => {
      if (!open) return whole.startsWith('<!--') ? whole : tag(whole);
      const inner = name.toLowerCase() === 'style' ? rewriteCss(body, { key, port, base }) : body;
      return tag(open) + inner + close;
    },
  );
  const head = /<head(\s[^>]*)?>/i.exec(out);
  if (head)
    out = out.slice(0, head.index + head[0].length) + shim + out.slice(head.index + head[0].length);
  else out = shim + out;
  return out;
}

export function rewriteCss(css, { key, port, base }) {
  return css.replace(/url\(\s*(["']?)((?:https?:)?\/\/[^"')\s]+)\1\s*\)/gi, (whole, q, url) => {
    try {
      return `url(${q}${toProxy(new URL(url, base).href, key, port)}${q})`;
    } catch {
      return whole;
    }
  });
}

const DROP_RESPONSE = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
  'keep-alive',
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'strict-transport-security',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'alt-svc',
  'report-to',
  'nel',
  'set-cookie',
  'clear-site-data',
]);

const DROP_REQUEST = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'accept-encoding',
  'content-length',
  'cookie',
  'origin',
  'referer',
  'proxy-authorization',
  'te',
  'trailer',
]);

// Which site asked for a request, as far as the cookie rules care: the page (`Origin`, else `Referer`), or the user (the deck
// itself asked, or a page asked its own origin). A request that tells nothing is taken as another site's and gets fewer cookies.
export function cookieContext(req, key, target) {
  const { origin, referer, 'sec-fetch-site': site, 'sec-fetch-mode': mode } = req.headers;
  const asked = (raw) => {
    try {
      new URL(raw);
    } catch {
      return 'null:';
    }
    const real = toReal(raw, key);
    return real === raw ? null : real;
  };
  let from = 'null:';
  if (site === 'same-origin') from = target;
  else if (origin !== 'null' && (origin || referer)) from = asked(origin || referer);
  return sameSiteContext({ target, from, navigate: mode === 'navigate', method: req.method });
}

export function responseHeaders(upstream, { key, port, target }) {
  const out = {};
  for (const [name, value] of upstream.headers) {
    if (DROP_RESPONSE.has(name)) continue;
    if (name === 'location') {
      try {
        out[name] = toProxy(new URL(value, target).href, key, port);
      } catch {
        out[name] = value;
      }
    } else if (name === 'access-control-allow-origin' && value !== '*' && value !== 'null') {
      try {
        out[name] = `http://${proxyHost(value, key, port)}`;
      } catch {
        out[name] = value;
      }
    } else out[name] = value;
  }
  return out;
}

export function requestHeaders(req, { key, target }) {
  const out = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (DROP_REQUEST.has(name) || value == null) continue;
    out[name] = Array.isArray(value) ? value.join(', ') : value;
  }
  if (out['sec-fetch-dest'] === 'iframe') out['sec-fetch-dest'] = 'document';
  const origin = realOrigin(safeHost(req.headers.origin), key);
  if (origin) out.origin = origin;
  if (req.headers.referer) out.referer = toReal(req.headers.referer, key);
  out['accept-encoding'] = 'gzip, deflate, br';
  out.host = new URL(target).host;
  return out;
}

const safeHost = (origin) => {
  try {
    return new URL(origin).host;
  } catch {
    return '';
  }
};

const IPV4_LOCAL =
  /^(0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/;

export const LOCAL = (address) => {
  const mapped = /^::ffff:(.+)$/i.exec(address)?.[1];
  if (mapped) return /^[\d.]+$/.test(mapped) ? IPV4_LOCAL.test(mapped) : true;
  return IPV4_LOCAL.test(address) || /^(::1?$|f[cd]|fe[89abcdef])/i.test(address);
};

async function isLocal(u, resolve = lookup) {
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  const all = await resolve(host, { all: true });
  return all.some((a) => LOCAL(a.address));
}

export async function targetAllowed(target, blockedPorts, allowed = new Set(), resolve = lookup) {
  try {
    const u = new URL(target);
    return !(await isLocal(u, resolve)) || mayReachLocal(u, blockedPorts, allowed);
  } catch {
    return false;
  }
}

export async function allowLocal(url, allowed, resolve = lookup) {
  const u = new URL(url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('not a web address');
  if (await isLocal(u, resolve).catch(() => false)) allowed.add(u.origin);
}

const portOf = (u) => Number(u.port || (u.protocol === 'https:' ? 443 : 80));
const mayReachLocal = (u, blockedPorts, allowed) =>
  !blockedPorts.includes(portOf(u)) && allowed.has(u.origin);

export function guardedLookup(target, blockedPorts, allowed, resolve = lookupEach) {
  const u = new URL(target);
  return (host, options, done) =>
    resolve(host, { ...options, all: true }, (error, list) => {
      if (error) return done(error);
      const ok = list.filter((a) => !LOCAL(a.address) || mayReachLocal(u, blockedPorts(), allowed));
      if (!ok.length) return done(Object.assign(new Error('local address'), { code: 'ELOCAL' }));
      if (options?.all) done(null, ok);
      else done(null, ok[0].address, ok[0].family);
    });
}

const MAX_BODY = 50 * 1024 * 1024;

async function readAll(req, max = MAX_BODY) {
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > max) throw new Error('request body too large');
    parts.push(part);
  }
  return Buffer.concat(parts);
}

const page = (status, title, text) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:16px system-ui;padding:3rem;color:#444"><h1 style="font-size:20px">${title}</h1><p>${text}</p></body>`;

const escape = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const charsetOf = (type) => /charset=([\w-]+)/i.exec(type)?.[1] ?? 'utf-8';

export function createWebProxy({
  deckOrigins = [],
  blockedPorts = [],
  fetch: get = undiciFetch,
} = {}) {
  const key = randomBytes(6).toString('hex');
  const allowed = new Set();
  const jar = createCookieJar();
  let port = 0;
  const agents = new Map();
  const agentFor = (target) => {
    const origin = new URL(target).origin;
    if (!agents.has(origin))
      agents.set(
        origin,
        new Agent({
          connect: { lookup: guardedLookup(target, () => [...blockedPorts, port], allowed) },
        }),
      );
    return agents.get(origin);
  };
  const shim = () =>
    readShim().replace('__SLIDE_NG_WEB__', JSON.stringify({ key, port, deck: deckOrigins }));

  async function scriptCookie(req, res, origin) {
    const pageUrl = String(req.headers['x-slide-ng-url'] ?? '');
    const own = req.method === 'POST' && req.headers['sec-fetch-site'] === 'same-origin';
    if (!own || !URL.canParse(pageUrl) || new URL(pageUrl).origin !== origin) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('not allowed');
      return;
    }
    await jar.fromScript((await readAll(req, 8192)).toString('utf8'), pageUrl);
    res.writeHead(204).end();
  }

  const server = createServer(async (req, res) => {
    const origin = realOrigin(req.headers.host, key);
    if (!origin) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    const path = req.url.startsWith('/') ? req.url : '/';
    if (path === SHIM_PATH) {
      res
        .writeHead(200, { 'content-type': 'text/javascript', 'cache-control': 'no-store' })
        .end(shim());
      return;
    }
    const target = origin + path;
    const html = (status, title, text) =>
      res
        .writeHead(status, { 'content-type': 'text/html; charset=utf-8' })
        .end(page(status, title, text));
    const refuse = () =>
      html(
        403,
        'Not shown here',
        `${escape(origin)} is on this computer or network, and the deck did not open it.`,
      );
    try {
      if (!(await targetAllowed(target, [...blockedPorts, port], allowed))) return refuse();
      if (path === COOKIE_PATH) return await scriptCookie(req, res, origin);
      const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readAll(req);
      const context = cookieContext(req, key, target);
      const sent = requestHeaders(req, { key, target });
      const cookie = await jar.header(target, context);
      if (cookie) sent.cookie = cookie;
      const upstream = await get(target, {
        method: req.method,
        headers: sent,
        body,
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
        dispatcher: agentFor(target),
      });
      await jar.store(upstream.headers.getSetCookie?.() ?? [], target, context);
      const headers = responseHeaders(upstream, { key, port, target });
      const type = upstream.headers.get('content-type') ?? '';
      const rewrite = /text\/html|application\/xhtml/i.test(type)
        ? rewriteHtml
        : /text\/css/i.test(type)
          ? rewriteCss
          : null;
      if (rewrite && req.method !== 'HEAD' && upstream.body) {
        const bytes = await upstream.arrayBuffer();
        const text = new TextDecoder(charsetOf(type)).decode(bytes);
        headers['content-type'] = type.replace(/;\s*charset=[\w-]+/i, '') + '; charset=utf-8';
        const visible = await jar.visible(target);
        res
          .writeHead(upstream.status, headers)
          .end(rewrite(text, { key, port, base: target, cookie: visible }));
        return;
      }
      res.writeHead(upstream.status, headers);
      if (!upstream.body || req.method === 'HEAD') return res.end();
      Readable.fromWeb(upstream.body)
        .on('error', () => res.destroy())
        .pipe(res);
    } catch (e) {
      if (!res.headersSent && e?.cause?.code === 'ELOCAL') refuse();
      else if (!res.headersSent)
        html(
          502,
          'Could not load this page',
          `${escape(target)}: ${escape(e?.cause?.code ?? e?.message ?? e)}`,
        );
      else res.destroy();
    }
  });

  return {
    key,
    server,
    jar,
    get port() {
      return port;
    },
    allow: (url) => allowLocal(url, allowed),
    listen: (wanted = 0) =>
      new Promise((resolve) =>
        server.listen(wanted, '127.0.0.1', () => {
          port = server.address().port;
          resolve(port);
        }),
      ),
  };
}
