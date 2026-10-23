// A small static file server for a built deck, used by `export` and `build --download` / `--og-image`.
// Unknown paths get index.html (the deck is a single-page app). `base` is the sub-path the deck was built for.
import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
  '.txt': 'text/plain',
};

/** The file inside `root` that a request path names, or null (outside the folder, or not a file). */
export function resolveRequest(root, base, pathname) {
  let path;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!path.startsWith(base)) return null;
  const file = normalize(join(root, path.slice(base.length)));
  if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) return null; // `..` got us out
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

/**
 * The bytes a `Range` header asks for in a file of `size` bytes: `{ start, end }` (inclusive), null to send the whole file
 * (no header, or one we do not serve, such as several ranges), or 'unsatisfiable' (the answer is a 416).
 */
export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? '');
  if (!match || (!match[1] && !match[2])) return null;
  let start;
  let end;
  if (!match[1]) {
    // `bytes=-500`: the last 500 bytes
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

/** Streams a file (or `range` of it) as the answer. If it cannot be read (it vanished), the answer is a 500 and the server goes on. */
export function sendFile(asset, res, range) {
  const stream = createReadStream(asset, range ?? {});
  stream.on('error', () => {
    if (res.headersSent) return res.destroy();
    ['content-type', 'content-length', 'content-range'].forEach((name) => res.removeHeader(name));
    res.statusCode = 500;
    res.end('could not read the file');
  });
  stream.pipe(res);
}

/** Starts the server on a free port of 127.0.0.1. Resolves `{ server, port, origin, close }`. */
export function serveDirectory(root, base = '/') {
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://x').pathname;
    const file = resolveRequest(root, base, pathname);
    // Anything that is not a file and has no extension is a deck address (/3, /print): the app answers it.
    const asset =
      file ?? (extname(pathname) ? null : resolveRequest(root, base, base + 'index.html'));
    if (!asset) {
      res.statusCode = 404;
      return res.end('not found');
    }
    res.setHeader('content-type', TYPES[extname(asset)] ?? 'application/octet-stream');
    // Byte ranges: without them Chromium cannot seek a video, so `<slide-ng-video printTimestamp>` would show the first frame.
    res.setHeader('accept-ranges', 'bytes');
    let size;
    try {
      size = statSync(asset).size;
    } catch {
      return sendFile(asset, res); // it vanished: sendFile answers 500
    }
    const range = parseRange(req.headers.range, size);
    if (range === 'unsatisfiable') {
      res.statusCode = 416;
      res.setHeader('content-range', `bytes */${size}`);
      return res.end();
    }
    if (range) {
      res.statusCode = 206;
      res.setHeader('content-range', `bytes ${range.start}-${range.end}/${size}`);
    }
    res.setHeader('content-length', range ? range.end - range.start + 1 : size);
    sendFile(asset, res, range);
  });
  return new Promise((resolvePromise) =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolvePromise({
        server,
        port,
        origin: `http://127.0.0.1:${port}`,
        close: () => {
          server.closeAllConnections();
          return new Promise((done) => server.close(done));
        },
      });
    }),
  );
}
