// While the Angular dev server has not had a good build yet it does not listen, so the browser could only show "connection
// refused". `slide-ng dev` serves this page on the port meanwhile: it shows the error and reloads itself as soon as the
// slides are served (wait-for-port.mjs makes the Angular server ask this page to step aside first).
import { createServer } from 'node:http';

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** The page. `error` is shown only on this machine's own browser when `remote` is off (it names files of the computer). */
export function waitingHtml(error, { remote = false } = {}) {
  const detail = remote
    ? '<p>The details are in the terminal of slide-ng dev.</p>'
    : error
      ? `<pre>${escape(error)}</pre>`
      : '<p>The details are in the terminal.</p>';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>slide.ng: the slides do not build yet</title>
<style>
  body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; color: #222; background: #fff; }
  pre { white-space: pre-wrap; background: #fdecec; color: #8a1111; padding: 1rem; border-radius: 6px; font-size: 14px; }
  @media (prefers-color-scheme: dark) { body { color: #eee; background: #181818; } pre { background: #3a1616; color: #ffb4b4; } }
</style></head>
<body><main>
<h1>The slides do not build yet</h1>
<p>Angular stopped on an error in the deck. Fix it and save: this page opens the slides by itself.</p>
${detail}
</main>
<script>
setInterval(async () => {
  try {
    const res = await fetch(location.href, { cache: 'no-store' });
    if (!res.headers.has('x-slide-ng-waiting')) location.reload();
  } catch {}
}, 1000);
</script>
</body></html>`;
}

/**
 * Starts the page on `port` (and `host`, as the Angular server would use them). `secret` is what wait-for-port.mjs sends to
 * make it close. Returns `{ show(error), close() }`; `onRelease` is called when the Angular server took the port over.
 * @param {{ port: number, host?: string, remote?: boolean, secret: string, onRelease?: () => void }} options
 */
export function startWaitingPage({ port, host, remote, secret, onRelease }) {
  let error = '';
  let closed = false;
  const server = createServer((req, res) => {
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
    res.writeHead(503, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '1',
      'x-slide-ng-waiting': '1',
    });
    res.end(waitingHtml(error, { remote }));
  });
  // The page's own WebSocket (the dev server's live reload) has nothing to talk to yet.
  server.on('upgrade', (_req, socket) => socket.destroy());
  // A port taken meanwhile (another program): the page is only a courtesy, the Angular server reports the port itself.
  server.on('error', () => (closed = true));
  server.listen(port, host ?? 'localhost');
  function close() {
    if (closed) return;
    closed = true;
    server.closeAllConnections?.();
    server.close();
  }
  return {
    show: (text) => (error = text ?? error),
    close,
    get closed() {
      return closed;
    },
  };
}
