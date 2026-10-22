// The MCP server on the dev server, at `/__mcp` (Slidev 52.17+), with the streamable HTTP transport of the SDK, stateless:
// every request gets a fresh server. Same tools as `slide-ng mcp`, plus `get_info` and `goto_slide` (scripts/mcp/dev-tools.mjs).
// It keeps the companion's rules: the Host and Origin checks, the password with --remote (as
// `Authorization: Bearer <password>`, limited like the login; the login cookie is only sent to /__slide-ng),
// edits inside the deck folder only.
// `mcp: false` in the headmatter turns it off.
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { check, clientAddress, readBody, safeEqual } from './auth.mjs';
import { HttpError } from './http-error.mjs';
import { MAX_FILE } from './monaco-write.mjs';
import { createMcpServer } from '../mcp/index.mjs';
import { DEV_TOOLS } from '../mcp/dev-tools.mjs';
import { TOOLS } from '../mcp/tools.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';

export const MCP_PATH = '/__mcp';

const asciiTrim = (text) => text.replace(/^[ \t]+|[ \t]+$/g, '');

/** Null when the request may use the MCP server, else `{ status, error }`. */
export function mcpDenied(req, ctx) {
  const denied = check(req, ctx, { needToken: false, needLogin: false });
  if (denied) return denied;
  if (!ctx.password) return null;
  const client = clientAddress(req);
  if (ctx.loginGuard.wait(client) > 0)
    return { status: 429, error: 'too many wrong passwords, try again later' };
  // HTTP drops the spaces and tabs around a header value (and `[ \t]+` those after "Bearer"), so the spaces around the
  // password never arrive: compare with the password without them. Spaces inside it count. Only ASCII spaces and tabs:
  // a UTF-8 password whose last byte is 0xA0 (à, Š, Ġ, Р) reads as U+00A0 here, which `trim()` and `\s` would remove.
  const bearer = /^Bearer[ \t]+(.+)$/i.exec(
    asciiTrim(String(req.headers.authorization ?? '')),
  )?.[1];
  // Node reads a header's bytes as Latin-1. A client that sends the password as UTF-8 (curl, most SDKs) gives other
  // characters for anything that is not ASCII, so its UTF-8 reading counts too; `fetch` sends Latin-1 where it can.
  const password = asciiTrim(ctx.password);
  const utf8 = bearer && Buffer.from(bearer, 'latin1').toString('utf8');
  if (bearer && (safeEqual(bearer, password) || safeEqual(utf8, password))) {
    ctx.loginGuard.ok(client);
    return null;
  }
  if (bearer) ctx.loginGuard.fail(client);
  return { status: 401, error: 'password required (send Authorization: Bearer <password>)' };
}

/** Answers one request to `/__mcp`. `serial` runs a job after the writes before it (routes.mjs). */
export async function handleMcp(req, res, ctx, { hub, serial }) {
  const denied = mcpDenied(req, ctx);
  if (denied) throw new HttpError(denied.status, denied.error);
  // A deck that does not parse right now keeps the server on: the tools report the problem themselves.
  const off = await parseDeck(ctx.entry).then(
    (deck) => deck.headmatter.mcp === false,
    () => false,
  );
  if (off) throw new HttpError(404, 'the MCP server is turned off (mcp: false)');
  // Stateless: no stream to open with GET and no session to end with DELETE, as in the SDK's stateless example.
  if (req.method !== 'POST')
    throw new HttpError(405, 'only POST: this MCP server keeps no sessions');
  let body;
  try {
    body = JSON.parse(await readBody(req, MAX_FILE * 2));
  } catch (e) {
    throw e.status ? e : new HttpError(400, 'bad JSON');
  }
  const server = createMcpServer(ctx.entry, {
    tools: [...TOOLS, ...DEV_TOOLS],
    context: {
      hub,
      url: `http://${req.headers.host}/`,
      ...(ctx.remote ? { remoteUrls: ctx.remoteUrls } : {}),
    },
  });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  // Tools that edit slides.md wait for the companion's own writes, and the other way round.
  await serial(() => transport.handleRequest(req, res, body));
}
