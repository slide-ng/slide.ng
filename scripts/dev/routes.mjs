// The companion server's answers. Every request goes through `check` (auth.mjs) first; nothing is done for a request
// that fails it. Writes need a JSON body, so a plain HTML form from another site cannot send one.
import { API, COOKIE, check, clientAddress, readBody, safeEqual } from './auth.mjs';
import { writeDrawing, MAX_DRAWING } from './drawings-store.mjs';
import { HttpError } from './http-error.mjs';
import { MCP_PATH, handleMcp } from './mcp-http.mjs';
import { MAX_FILE, writeMonaco } from './monaco-write.mjs';
import { readNotes, readSlide, writeDrag, writeNote, writeSlide } from './slides-write.mjs';
import { canvasSize } from '../lib/canvas-size.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(body));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The request handler: `http.createServer(createHandler(ctx, { hub }))`. `hub` is the sync hub, for the MCP tools. */
export function createHandler(ctx, { hub } = {}) {
  // Writes run one after the other, so two quick moves cannot overwrite each other's lines.
  let queue = Promise.resolve();
  const serial = (job) => (queue = queue.then(job, job));

  async function body(req, limit) {
    if (!/^application\/json\b/i.test(req.headers['content-type'] ?? ''))
      throw new HttpError(415, 'JSON expected');
    try {
      return JSON.parse(await readBody(req, limit));
    } catch (e) {
      throw e.status ? e : new HttpError(400, 'bad JSON');
    }
  }

  const number = (text) => (/^\d{1,6}$/.test(text) ? Number(text) : NaN);

  async function route(req, res, url) {
    const path = url.pathname.slice(API.length);
    const method = req.method;
    const unlocked = path === '/session' || path === '/login'; // these hand out the token
    const denied = check(req, ctx, { needToken: !unlocked, needLogin: path !== '/login' });
    if (denied) throw new HttpError(denied.status, denied.error);

    if (path === '/session' && method === 'GET')
      return json(res, 200, { token: ctx.token, remote: ctx.remote });

    if (path === '/login' && method === 'POST') {
      const client = clientAddress(req);
      const wait = ctx.loginGuard.wait(client);
      if (wait > 0)
        return json(
          res,
          429,
          { error: 'too many wrong passwords, try again later' },
          { 'retry-after': String(Math.ceil(wait / 1000)) },
        );
      const { password } = await body(req, 1_000);
      if (!ctx.password || !safeEqual(password, ctx.password)) {
        ctx.loginGuard.fail(client);
        await sleep(400);
        throw new HttpError(401, 'wrong password');
      }
      ctx.loginGuard.ok(client);
      const cookie = `${COOKIE}=${ctx.sessions.issue()}; HttpOnly; SameSite=Strict; Max-Age=${ctx.sessions.maxAgeSeconds}; Path=${API}`;
      return json(res, 200, { ok: true }, { 'set-cookie': cookie });
    }

    let m;
    if ((m = /^\/slides\/(\d+)\/drag$/.exec(path)) && method === 'POST') {
      const { site, pos } = await body(req, 2_000);
      await serial(() => writeDrag(ctx, number(m[1]), site, pos));
      return json(res, 200, { ok: true });
    }
    if ((m = /^\/slides\/(\d+)\/source$/.exec(path))) {
      if (method === 'GET') return json(res, 200, { raw: await readSlide(ctx, number(m[1])) });
      if (method === 'PUT') {
        const { raw, base } = await body(req, MAX_FILE * 2);
        if (typeof raw !== 'string') throw new HttpError(400, 'raw must be text');
        await serial(() => writeSlide(ctx, number(m[1]), raw, base));
        return json(res, 200, { ok: true });
      }
    }
    if (path === '/notes' && method === 'GET')
      return json(res, 200, { notes: await readNotes(ctx) });
    if ((m = /^\/slides\/(\d+)\/note$/.exec(path)) && method === 'PUT') {
      const { note, base } = await body(req, MAX_FILE * 2);
      if (typeof note !== 'string') throw new HttpError(400, 'note must be text');
      await serial(() => writeNote(ctx, number(m[1]), note, base));
      return json(res, 200, { ok: true });
    }
    if ((m = /^\/drawings\/(\d+)$/.exec(path)) && method === 'PUT') {
      const { svg } = await body(req, MAX_DRAWING + 1_000);
      // Parsed inside the queue, so it sees the deck as the writes before it left it.
      await serial(async () => {
        const { slides, headmatter } = await parseDeck(ctx.entry);
        await writeDrawing(ctx, number(m[1]), svg, slides.length, canvasSize(headmatter));
      });
      return json(res, 200, { ok: true });
    }
    if ((m = /^\/monaco\/([\w-]{1,40})$/.exec(path)) && method === 'PUT') {
      const { content } = await body(req, MAX_FILE + 1_000);
      await serial(async () => {
        // The roots too: the index.html of a theme or addon is not writable either.
        const { roots } = await parseDeck(ctx.entry);
        writeMonaco(
          ctx,
          m[1],
          content,
          roots.map((r) => r.dir),
        );
      });
      return json(res, 200, { ok: true });
    }
    throw new HttpError(404, 'not found');
  }

  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === MCP_PATH) return await handleMcp(req, res, ctx, { hub, serial });
      if (!url.pathname.startsWith(`${API}/`)) throw new HttpError(404, 'not found');
      await route(req, res, url);
    } catch (e) {
      const status = e instanceof HttpError || e.status ? e.status : 500;
      if (status === 500) console.error('[dev-server]', e);
      if (!res.headersSent) {
        // After a too big body the client may still be sending: answer, then hang up.
        if (status === 413) res.on('finish', () => req.destroy());
        json(
          res,
          status,
          { error: status === 500 ? 'server error' : e.message },
          status === 413 ? { connection: 'close' } : {},
        );
      }
    }
  };
}
