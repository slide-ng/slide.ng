// Whether a site lets another page show it in an <iframe>: its X-Frame-Options and CSP frame-ancestors headers, read by the
// companion server because a page cannot see why a cross-origin frame stayed blank. Only the answer leaves the server.

export function framingAllowed(headers, embedder) {
  const csp = (headers.get('content-security-policy') ?? '')
    .split(',')
    .flatMap((policy) => policy.split(';'))
    .map((d) => d.trim().split(/\s+/))
    .filter(([name]) => name?.toLowerCase() === 'frame-ancestors');
  if (csp.length) return csp.every(([, ...sources]) => ancestorAllowed(sources, embedder));
  const xfo = (headers.get('x-frame-options') ?? '').trim().toLowerCase();
  return !(xfo === 'deny' || xfo === 'sameorigin' || xfo.startsWith('allow-from'));
}

function ancestorAllowed(sources, embedder) {
  const page = new URL(embedder);
  return sources.some((raw) => {
    const s = raw.toLowerCase();
    if (s === "'none'" || s === "'self'") return false;
    if (s === '*') return true;
    if (/^[a-z][a-z\d+.-]*:$/.test(s)) return page.protocol === s;
    const m = /^(?:([a-z][a-z\d+.-]*):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?/.exec(s);
    if (!m) return false;
    const [, scheme, wild, host, port] = m;
    if (scheme && `${scheme}:` !== page.protocol) return false;
    const hostOk = wild ? page.hostname.endsWith(`.${host}`) : page.hostname === host;
    const pagePort = page.port || (page.protocol === 'https:' ? '443' : '80');
    const portOk = !port || port === '*' || port === pagePort;
    return hostOk && portOk;
  });
}

const cache = new Map();
const CACHE_MS = 10 * 60_000;

export async function checkFraming(address, embedder, { fetch: get = fetch, now = Date.now } = {}) {
  let url;
  try {
    url = new URL(address);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const key = `${url.href} ${embedder}`;
  const hit = cache.get(key);
  if (hit && now() - hit.at < CACHE_MS) return hit.framable;
  let framable;
  try {
    const res = await get(url.href, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5_000),
      headers: { accept: 'text/html' },
    });
    await res.body?.cancel();
    framable = framingAllowed(res.headers, embedder);
  } catch {
    framable = null;
  }
  if (cache.size > 500) cache.clear();
  cache.set(key, { framable, at: now() });
  return framable;
}
