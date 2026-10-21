// Used by `ng serve` (angular.json: serve.options.proxyConfig). Sends `/__slide-ng/*`, WebSockets included, and `/__mcp`
// to the companion server that scripts/dev.mjs started (scripts/dev/server.mjs). `changeOrigin` stays off, so the
// companion sees the Host and Origin the browser really used and can check them.
const port = process.env.SLIDE_NG_DEV_PORT;

// A tab that is closed or reloaded drops its WebSocket: the proxy then reports ECONNRESET (or EPIPE) in red, once per
// tab. That is normal, so it is not passed on to the dev server's log; any other proxy error still is.
const GONE = new Set(['ECONNRESET', 'EPIPE', 'ECONNABORTED']);

/** Keeps the WebSocket errors of a closed tab out of the log (the proxy's and the browser socket's). */
export function quietClosedSockets(proxy) {
  const emit = proxy.emit;
  proxy.emit = function (event, error, req, res, ...rest) {
    // A WebSocket error has the socket as `res` (an HTTP response has `req`): end it without a word.
    if (event === 'error' && GONE.has(error?.code) && res && !('req' in res)) {
      res.end?.();
      return true;
    }
    return emit.call(this, event, error, req, res, ...rest);
  };
  // The browser's socket logs its own reset too. This runs before the dev server adds that logger to the socket: such an
  // error goes only to the listeners already there (the proxy's, which close the companion's side).
  proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
    const before = socket.listeners('error');
    const emitSocket = socket.emit;
    socket.emit = function (event, error, ...rest) {
      if (event !== 'error' || !GONE.has(error?.code))
        return emitSocket.call(this, event, error, ...rest);
      for (const listener of before) listener.call(this, error, ...rest);
      return true;
    };
  });
}

export default port
  ? {
      '/__slide-ng': {
        target: `http://127.0.0.1:${port}`,
        ws: true,
        changeOrigin: false,
        xfwd: true, // adds the real client address (X-Forwarded-For), which the companion uses to limit wrong passwords
        secure: false,
        configure: quietClosedSockets,
      },
      // The MCP server (scripts/dev/mcp-http.mjs), with the same checks.
      '/__mcp': {
        target: `http://127.0.0.1:${port}`,
        changeOrigin: false,
        xfwd: true,
        secure: false,
      },
    }
  : {};
