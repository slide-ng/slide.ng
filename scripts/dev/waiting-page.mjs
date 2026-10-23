// While the Angular dev server has not had a good build yet it does not listen, so the browser could only show "connection
// refused", and another `slide-ng dev` would take the port. `slide-ng dev` serves this page on the port from the start: it
// says the slides are building, shows the error of a failed build, and reloads itself as soon as the slides are served
// (wait-for-port.mjs makes the Angular server ask this page to step aside first).
import { createServer } from 'node:http';
import { isIP } from 'node:net';

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * The Host check of the Angular dev server (Vite's `isHostAllowed` with the `allowedHosts` Angular gives it: none of its own,
 * plus the address it listens on), so the waiting page answers the same addresses as the slides will: any IP address,
 * `localhost` and `*.localhost` (as written: `LOCALHOST` is refused), and the `--bind` address. A DNS rebinding page, which
 * needs a name, is refused.
 */
export function devServerHostAllowed(hostHeader, bindHost) {
  if (hostHeader === undefined) return true; // not a browser: it can send any Host it likes anyway
  const host = String(hostHeader).trim();
  if (/^(?:file|.+-extension):/i.test(host)) return true;
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    return end > 0 && isIP(host.slice(1, end)) === 6;
  }
  const colon = host.indexOf(':');
  const name = colon === -1 ? host : host.slice(0, colon);
  if (isIP(name) === 4) return true;
  return name === 'localhost' || name.endsWith('.localhost') || (!!bindHost && name === bindHost);
}

/**
 * The page. `error` is shown only on this machine's own browser when `remote` is off (it names files of the computer).
 * `building` is the first build, before any error: the page then only says that the slides are on their way.
 */
export function waitingHtml(error, { remote = false, building = false } = {}) {
  const detail = remote
    ? '<p>The details are in the terminal of slide-ng dev.</p>'
    : error
      ? `<pre>${escape(error)}</pre>`
      : '<p>The details are in the terminal.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>slide.ng: ${building ? 'building the slides' : 'the slides do not build yet'}</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; color: #222; background: #fff; }
  pre { white-space: pre-wrap; background: #fdecec; color: #8a1111; padding: 1rem; border-radius: 6px; font-size: 14px; }
  @media (prefers-color-scheme: dark) { body { color: #eee; background: #181818; } pre { background: #3a1616; color: #ffb4b4; } }
</style></head>
<body><main>
${
  building
    ? '<h1>Building the slides</h1>\n<p>The first build takes a few seconds: this page opens the slides by itself.</p>'
    : `<h1>The slides do not build yet</h1>
<p>Angular stopped on an error in the deck. Fix it and save: this page opens the slides by itself.</p>
${detail}`
}
</main>
<script>
setInterval(async () => {
  try {
    // Asked this way the waiting page answers 200 (a 503 would log an error in the console every second).
    const res = await fetch(location.href, { cache: 'no-store', headers: { 'x-slide-ng-poll': '1' } });
    if (!res.headers.has('x-slide-ng-waiting')) location.reload();
  } catch {}
}, 1000);
</script>
</body></html>`;
}

/**
 * Starts the page on `port` (and `host`, as the Angular server would use them). `secret` is what wait-for-port.mjs sends to
 * make it close. Returns `{ ready, show(error), close() }`; `onRelease` is called when the Angular server took the port over.
 * @param {{ port: number, host?: string, remote?: boolean, secret: string, onRelease?: () => void }} options
 */
export function startWaitingPage({ port, host, remote, secret, onRelease }) {
  let error = '';
  let failed = false; // until a build fails, the page says the slides are being built
  let closed = false;
  const handle = (req, res) => {
    // The Host check of the Angular dev server it stands in for: a DNS rebinding page must not read the error (it names
    // files).
    if (!devServerHostAllowed(req.headers.host, host)) {
      res.writeHead(403).end();
      return;
    }
    if (req.url === '/__slide-ng-release' && req.method === 'POST') {
      if (req.headers['x-slide-ng-wait'] !== secret) {
        res.writeHead(403).end();
        return;
      }
      res.writeHead(200).end();
      close();
      onRelease?.();
      return;
    }
    if (req.headers['x-slide-ng-poll']) {
      res.writeHead(200, { 'cache-control': 'no-store', 'x-slide-ng-waiting': '1' }).end();
      return;
    }
    res.writeHead(503, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '1',
      'x-slide-ng-waiting': '1',
    });
    res.end(waitingHtml(error, { remote, building: !failed }));
  };
  // Without a host, both loopback addresses: `localhost` is 127.0.0.1 on one machine and ::1 on another (and Node listens
  // on the first one only), and the browser, a second dev server or a test may ask either. Never the network: the error
  // names files of this computer.
  const servers = (host ? [host] : ['127.0.0.1', '::1']).map((address) => {
    const server = createServer(handle);
    // The page's own WebSocket (the dev server's live reload) has nothing to talk to yet.
    server.on('upgrade', (_req, socket) => socket.destroy());
    const ready = new Promise((done) => {
      // A port taken meanwhile (another program), or no IPv6 here: the page is only a courtesy, the Angular server reports
      // the port itself.
      server.once('error', () => ((server.failed = true), done()));
      server.listen(port, address, () => done());
    });
    // The page alone never keeps `slide-ng dev` running: when the generator fails before anything else starts, it exits.
    server.unref();
    return { server, ready };
  });
  const ready = Promise.all(servers.map((s) => s.ready)).then(() => {
    if (servers.every(({ server }) => server.failed)) closed = true;
  });
  function close() {
    if (closed) return;
    closed = true;
    for (const { server } of servers) {
      if (server.failed) continue;
      server.closeAllConnections?.();
      server.close();
    }
  }
  return {
    /** Settles once the page listens (or could not). */
    ready,
    show: (text) => {
      failed = true;
      error = text ?? error;
    },
    close,
    get closed() {
      return closed;
    },
  };
}
