// @vitest-environment node
// The MCP server of the dev server (`/__mcp`), started for real with a client of the SDK and a fake browser window.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { request } from 'node:http';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { WebSocket } from 'ws';
import { readConfig } from './config.mjs';
import { startServer } from './server.mjs';
import { gotoMessages } from '../mcp/dev-tools.mjs';

const SLIDES = '---\ntitle: Deck\n---\n\n# One\n\n---\n\n# Two\n\n---\n\n# Three\n';
const servers: { close: () => void }[] = [];
afterAll(() => servers.forEach((s) => s.close()));

async function start(env: Record<string, string> = {}, slides = SLIDES) {
  const root = mkdtempSync(join(tmpdir(), 'slide-ng-mcp-http-'));
  writeFileSync(join(root, 'slides.md'), slides);
  const ctx = readConfig({ SLIDE_NG_TOKEN: 'tok', ...env }, root);
  const started = await startServer({ ...ctx, port: 0 });
  servers.push({
    close: () => {
      started.server.close();
      started.hub.close();
    },
  });
  return { root, port: started.port as number };
}

async function connect(port: number, headers: Record<string, string> = {}) {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/__mcp`), {
      requestInit: { headers },
    }),
  );
  return client;
}
const call = async (client: Client, name: string, args: Record<string, unknown> = {}) => {
  const r: any = await client.callTool({ name, arguments: args });
  return {
    error: Boolean(r.isError),
    json: r.isError ? null : JSON.parse(r.content[0].text),
    text: r.content[0].text,
  };
};
const post = (port: number, headers: Record<string, string>) =>
  fetch(`http://127.0.0.1:${port}/__mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...headers,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });

// A browser window: joins the sync hub and keeps what it receives.
function windowOn(port: number) {
  const received: any[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}/__slide-ng/ws?token=tok`);
  socket.on('message', (m) => received.push(JSON.parse(String(m))));
  return new Promise<{ socket: WebSocket; received: any[] }>((done) =>
    socket.on('open', () => done({ socket, received })),
  );
}
const tick = (ms = 100) => new Promise((done) => setTimeout(done, ms));

describe('MCP over HTTP on the dev server', () => {
  it('lists the slide tools plus get_info and goto_slide', async () => {
    const { port } = await start();
    const client = await connect(port);
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        'get_info',
        'get_outline',
        'get_slide',
        'goto_slide',
        'insert_slide',
        'list_slides',
        'move_slide',
        'remove_slide',
        'update_slide',
      ].sort(),
    );
    await client.close();
  });

  it('get_info: entry, title, slides, files, address, and the slide a window reported', async () => {
    const { root, port } = await start();
    const client = await connect(port);
    const before = (await call(client, 'get_info')).json;
    expect(before).toMatchObject({
      entry: join(root, 'slides.md'),
      title: 'Deck',
      slides: 3,
      files: ['slides.md'],
      url: `http://127.0.0.1:${port}/`,
      current: null,
    });
    const win = await windowOn(port);
    win.socket.send(JSON.stringify({ channel: 'shared', data: { page: 2, clicks: 1 } }));
    await tick();
    expect((await call(client, 'get_info')).json.current).toEqual({ page: 2, clicks: 1 });
    win.socket.close();
    await client.close();
  });

  it('goto_slide moves every window, presenters and viewers, and refuses a slide that does not exist', async () => {
    const { port } = await start();
    const client = await connect(port);
    const a = await windowOn(port);
    const b = await windowOn(port);
    const moved = await call(client, 'goto_slide', { no: 3, clicks: 2 });
    expect(moved.json).toEqual({ no: 3, clicks: 2, windows: 2 });
    await tick();
    for (const w of [a, b]) {
      expect(w.received.map((m) => [m.data.page, m.data.clicks, m.data.lastUpdate.type])).toEqual([
        [3, 2, 'viewer'],
        [3, 2, 'presenter'],
      ]);
    }
    expect((await call(client, 'get_info')).json.current).toEqual({ page: 3, clicks: 2 });
    const wrong = await call(client, 'goto_slide', { no: 9 });
    expect(wrong.error && wrong.text.includes('there is no slide 9')).toBe(true);
    a.socket.close();
    b.socket.close();
    await client.close();
  });

  it('the edit tools write slides.md as with slide-ng mcp', async () => {
    const { root, port } = await start();
    const client = await connect(port);
    const r = await call(client, 'update_slide', { no: 2, markdown: '# Second\n\nnew text' });
    expect(r.json).toMatchObject({ slides: 3, no: 2, title: 'Second' });
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toContain('# Second\n\nnew text');
    await client.close();
  });

  it('refuses a foreign Origin and a foreign Host', async () => {
    const { port } = await start();
    expect((await post(port, { origin: 'http://evil.example' })).status).toBe(403);
    expect((await post(port, { origin: `http://127.0.0.1:${port}` })).status).toBe(200);
    const res = await new Promise<number>((done) => {
      const req = request(
        {
          host: '127.0.0.1',
          port,
          method: 'POST',
          path: '/__mcp',
          headers: { host: 'evil.example' },
        },
        (r: any) => done(r.statusCode),
      );
      req.end('{}');
    });
    expect(res).toBe(403);
  });

  it('with --remote it needs the password, as a bearer token, and limits wrong ones', async () => {
    const { port } = await start({ SLIDE_NG_REMOTE: '1', SLIDE_NG_PASSWORD: 'pw' });
    expect((await post(port, {})).status).toBe(401);
    expect((await post(port, { authorization: 'Bearer pw' })).status).toBe(200);
    const client = await connect(port, { authorization: 'Bearer pw' });
    expect((await call(client, 'get_info')).json.slides).toBe(3);
    await client.close();
    const statuses = [];
    for (let i = 0; i < 7; i++)
      statuses.push((await post(port, { authorization: 'Bearer wrong' })).status);
    expect(statuses).toContain(429);
    expect((await post(port, { authorization: 'Bearer pw' })).status).toBe(429);
  });

  it('takes a password with spaces (--remote="my talk pw")', async () => {
    const { port } = await start({ SLIDE_NG_REMOTE: '1', SLIDE_NG_PASSWORD: 'my talk pw' });
    expect((await post(port, { authorization: 'Bearer my talk pw' })).status).toBe(200);
    expect((await post(port, { authorization: 'Bearer my talk' })).status).toBe(401);
    expect((await post(port, { authorization: 'Bearer my' })).status).toBe(401);
  });

  it('is off with mcp: false in the headmatter', async () => {
    const { port } = await start({}, '---\nmcp: false\n---\n\n# One\n');
    expect((await post(port, {})).status).toBe(404);
  });
});

describe('gotoMessages', () => {
  it('sends a viewer move for presenters and a presenter move for viewers', () => {
    expect(gotoMessages(4, 1, 5)).toEqual([
      {
        channel: 'shared',
        data: { page: 4, clicks: 1, lastUpdate: { id: 'slide-ng-mcp', type: 'viewer', time: 5 } },
      },
      {
        channel: 'shared',
        data: {
          page: 4,
          clicks: 1,
          lastUpdate: { id: 'slide-ng-mcp', type: 'presenter', time: 5 },
        },
      },
    ]);
  });
});
