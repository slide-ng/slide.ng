// The dev companion server: what the Angular dev server cannot do. It writes to slides.md, saves drawings,
// passes sync messages between windows (WebSocket), and serves MCP at `/__mcp` (mcp-http.mjs). It listens on 127.0.0.1 only; the Angular dev server
// proxies `/__slide-ng/*` to it (proxy.conf.mjs), so the page uses the same address and the same origin for everything.
// Even with `--remote` this server is not reachable from the network by itself: only through the proxy, with the same checks.
import { createServer } from 'node:http';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { API, check } from './auth.mjs';
import { readConfig } from './config.mjs';
import { createHandler } from './routes.mjs';
import { createHub } from './ws-hub.mjs';
import { createWebProxy } from './web-proxy.mjs';

export async function startServer(ctx) {
  if (!ctx.remote && ctx.appPort) {
    const proxy = createWebProxy({
      deckOrigins: [`http://localhost:${ctx.appPort}`, `http://127.0.0.1:${ctx.appPort}`],
      blockedPorts: [ctx.appPort, ctx.port].filter(Boolean),
    });
    await proxy.listen();
    ctx.webProxy = { key: proxy.key, port: proxy.port };
  }
  const hub = createHub();
  const server = createServer(createHandler(ctx, { hub }));
  // A WebSocket starts as an HTTP request: it gets the same checks as a write (host, origin, password, token).
  server.on('upgrade', (req, socket, head) => {
    const path = new URL(req.url, 'http://x').pathname;
    const denied = path === `${API}/ws` ? check(req, ctx) : { status: 404, error: 'not found' };
    if (denied) {
      socket.end(`HTTP/1.1 ${denied.status} ${denied.error}\r\nConnection: close\r\n\r\n`);
      return;
    }
    hub.handleUpgrade(req, socket, head, (ws) => hub.emit('connection', ws, req));
  });
  return new Promise((resolve) =>
    server.listen(ctx.port, '127.0.0.1', () =>
      resolve({ server, hub, port: server.address().port }),
    ),
  );
}

// Started as a program by scripts/dev.mjs (or by a test, with its own environment).
// Run directly (not imported by a test): compare real paths, since the URL is percent-encoded (`a%20b`) and argv may be a link.
const real = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return null; // a bundled test has no such file
  }
};
const self = real(fileURLToPath(import.meta.url));
if (self && process.argv[1] && self === real(process.argv[1])) {
  const ctx = readConfig(process.env);
  // `slide-ng dev` says how each Angular build ended (cli/dev.mjs), so a page opened or reloaded while the build is broken
  // can show the error again (GET /build-error); Angular sends it only once, to the pages open at the time.
  process.on('message', (m) => {
    if (m && typeof m === 'object' && 'buildError' in m)
      ctx.buildError =
        m.buildError && typeof m.buildError.message === 'string'
          ? { message: m.buildError.message, file: String(m.buildError.file ?? '') }
          : null;
  });
  const { port } = await startServer(ctx);
  console.log(
    `[dev-server] listening on 127.0.0.1:${port}${ctx.remote ? ' (remote: password required)' : ''}`,
  );
}
