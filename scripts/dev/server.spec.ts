// @vitest-environment node
// The companion server, started for real on a temporary project and attacked over HTTP and WebSocket.
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { readConfig } from './config.mjs';
import { startServer } from './server.mjs';

const SLIDES = '---\ntitle: T\n---\n\n# One\n\n<img slide-ng-drag="[1,2,3,4]">\n\n---\n\n# Two\n';
let root: string, port: number, close: () => void, ctx: any;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'slide-ng-server-'));
  writeFileSync(join(root, 'slides.md'), SLIDES);
  writeFileSync(join(root, 'snippet.ts'), 'old\n');
  mkdirSync(join(root, '.slide-ng'));
  writeFileSync(
    join(root, '.slide-ng/monaco-files.json'),
    JSON.stringify({
      abc123: 'snippet.ts',
      up: '../../etc/passwd',
      abs: '/etc/passwd',
      gone: 'missing.ts',
      setup: 'setup/shiki.ts',
      pkg: 'package.json',
      git: '.git/hooks/pre-commit',
      script: 'run.sh',
      mine: 'snippet.ts',
    }),
  );
  mkdirSync(join(root, 'setup'));
  writeFileSync(join(root, 'setup/shiki.ts'), 'export default {};\n');
  writeFileSync(join(root, 'package.json'), '{}\n');
  mkdirSync(join(root, '.git/hooks'), { recursive: true });
  writeFileSync(join(root, '.git/hooks/pre-commit'), '#!/bin/sh\n');
  writeFileSync(join(root, 'run.sh'), '#!/bin/sh\n');
  ctx = readConfig({ SLIDE_NG_TOKEN: 'tok' }, root);
  const started = await startServer({ ...ctx, port: 0 });
  port = started.port;
  close = () => {
    started.server.close();
    started.hub.close();
  };
});
afterAll(() => close());

interface Answer {
  status: number;
  json: any;
  headers: Record<string, any>;
}
const call = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
  callOn(port, method, path, body, headers);
function callOn(
  port: number,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Answer> {
  const text =
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method,
        path,
        headers: { 'content-type': 'application/json', 'x-slide-ng-token': 'tok', ...headers },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode!,
            headers: res.headers,
            json: data ? JSON.parse(data) : null,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end(text);
  });
}
// A server that refuses a big body hangs up while it is still being sent, so the client may get a reset instead of the 413.
const statusOf = (answer: Promise<Answer>) =>
  answer.then(
    (r) => r.status,
    (e) => (['EPIPE', 'ECONNRESET'].includes(e.code) ? 413 : Promise.reject(e)),
  );
const drag = (body: unknown, headers = {}) =>
  call('POST', '/__slide-ng/slides/1/drag', body, headers);

describe('session', () => {
  it('hands out the token to a local page without needing one', async () => {
    const r = await call('GET', '/__slide-ng/session', undefined, { 'x-slide-ng-token': '' });
    expect(r.status).toBe(200);
    expect(r.json.token).toBe('tok');
  });
  it('answers 404 outside its own address', async () => {
    expect((await call('GET', '/other')).status).toBe(404);
    expect((await call('GET', '/__slide-ng/nothing')).status).toBe(404);
  });
});

describe('writes to slides.md', () => {
  it('moves a slide-ng-drag with the right token', async () => {
    const r = await drag({ site: 0, pos: '10,20,30,_' });
    expect(r.status).toBe(200);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toBe(
      SLIDES.replace('[1,2,3,4]', '[10,20,30,NaN]'),
    );
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('rejects a wrong or missing token', async () => {
    expect((await drag({ site: 0, pos: '1,2,3,4' }, { 'x-slide-ng-token': 'wrong' })).status).toBe(
      403,
    );
    expect((await drag({ site: 0, pos: '1,2,3,4' }, { 'x-slide-ng-token': '' })).status).toBe(403);
  });
  it('rejects a wrong Origin even with the right token', async () => {
    expect(
      (await drag({ site: 0, pos: '1,2,3,4' }, { origin: 'http://evil.example' })).status,
    ).toBe(403);
  });
  it('accepts the same Origin as Host', async () => {
    expect(
      (await drag({ site: 0, pos: '1,2,3,4' }, { origin: `http://127.0.0.1:${port}` })).status,
    ).toBe(200);
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('rejects a wrong Host (DNS rebinding)', async () => {
    expect((await drag({ site: 0, pos: '1,2,3,4' }, { host: 'evil.example' })).status).toBe(403);
  });
  it('rejects a body that is not JSON, or has the wrong type', async () => {
    expect(
      (
        await call('POST', '/__slide-ng/slides/1/drag', 'x=1', {
          'content-type': 'application/x-www-form-urlencoded',
        })
      ).status,
    ).toBe(415);
    expect((await call('POST', '/__slide-ng/slides/1/drag', '{nope')).status).toBe(400);
  });
  it('rejects a huge body with 413', async () => {
    const r = await call(
      'POST',
      '/__slide-ng/slides/1/drag',
      JSON.stringify({ site: 0, pos: 'x'.repeat(50_000) }),
    );
    expect(r.status).toBe(413);
  });
  it('rejects positions that are not numbers, and slides that do not exist', async () => {
    expect((await drag({ site: 0, pos: '"><script>alert(1)</script>' })).status).toBe(422);
    expect(
      (await call('POST', '/__slide-ng/slides/99/drag', { site: 0, pos: '1,2,3,4' })).status,
    ).toBe(404);
    expect(
      (await call('POST', '/__slide-ng/slides/0/drag', { site: 0, pos: '1,2,3,4' })).status,
    ).toBe(400);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toBe(SLIDES);
  });
  it('cannot switch on settings that widen what a build reads or downloads', async () => {
    const before = readFileSync(join(root, 'slides.md'), 'utf8');
    for (const raw of [
      '---\ntitle: T\nallowOutsideRoot: true\n---\n\n# One',
      '---\ntitle: T\n"allowOutside\\x52oot": true\n---\n\n# One',
      '---\ntitle: [\nallowOutsideRoot: true\n---\n\n# One', // does not parse: still refused
      '---\ntitle: T\nfonts:\n  allowCustomProvider: true\n---\n\n# One',
    ]) {
      const r = await call('PUT', '/__slide-ng/slides/1/source', { raw });
      expect(r.status, raw).toBe(422);
    }
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toBe(before);
    // Half-typed frontmatter that does not mention them is still saved.
    expect(
      (await call('PUT', '/__slide-ng/slides/1/source', { raw: '---\ntitle: [\n---\n\n# One' }))
        .status,
    ).toBe(200);
    writeFileSync(join(root, 'slides.md'), before);
  });
  it('reads and replaces a slide for the side editor', async () => {
    const got = await call('GET', '/__slide-ng/slides/2/source');
    expect(got.json.raw).toContain('# Two');
    expect(
      (await call('PUT', '/__slide-ng/slides/2/source', { raw: '\n# Two\n\nedited' })).status,
    ).toBe(200);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toContain('edited');
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('refuses a save when the slide changed in the file since the editor read it', async () => {
    const base = (await call('GET', '/__slide-ng/slides/2/source')).json.raw;
    const r = await call('PUT', '/__slide-ng/slides/2/source', {
      raw: '\n# Two\n\nmine',
      base: base + 'changed elsewhere',
    });
    expect(r.status).toBe(409);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).not.toContain('mine');
    expect(
      (await call('PUT', '/__slide-ng/slides/2/source', { raw: '\n# Two\n\nmine', base })).status,
    ).toBe(200);
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('reads every note and writes one for the overview and the notes editor', async () => {
    expect((await call('GET', '/__slide-ng/notes')).json.notes).toEqual(['', '']);
    expect(
      (await call('PUT', '/__slide-ng/slides/2/note', { note: 'Say hello.', base: '' })).status,
    ).toBe(200);
    const file = readFileSync(join(root, 'slides.md'), 'utf8');
    expect(file).toBe(SLIDES.replace('# Two\n', '# Two\n\n<!--\nSay hello.\n-->\n'));
    expect((await call('GET', '/__slide-ng/notes')).json.notes).toEqual(['', 'Say hello.']);
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('refuses a note that changed in the file since the page read it, or that closes the comment', async () => {
    const stale = await call('PUT', '/__slide-ng/slides/1/note', { note: 'x', base: 'older' });
    expect(stale.status).toBe(409);
    const closing = await call('PUT', '/__slide-ng/slides/1/note', { note: '--> <b>x</b>' });
    expect(closing.status).toBe(422);
    expect((await call('PUT', '/__slide-ng/slides/1/note', { note: 3 })).status).toBe(400);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toBe(SLIDES);
  });
});

describe('{monaco-write}', () => {
  it('writes a listed file', async () => {
    expect((await call('PUT', '/__slide-ng/monaco/abc123', { content: 'new' })).status).toBe(200);
    expect(readFileSync(join(root, 'snippet.ts'), 'utf8')).toBe('new\n');
  });
  it('refuses ids that are not listed, including prototype names', async () => {
    for (const id of ['nope', '__proto__', 'constructor', 'toString'])
      expect((await call('PUT', `/__slide-ng/monaco/${id}`, { content: 'x' })).status).toBe(404);
  });
  it('refuses listed paths that leave the project: ../../etc/passwd and absolute paths', async () => {
    expect((await call('PUT', '/__slide-ng/monaco/up', { content: 'x' })).status).toBe(403);
    expect((await call('PUT', '/__slide-ng/monaco/abs', { content: 'x' })).status).toBe(403);
  });
  it('re-checks the target at write time: setup, package, git and script files stay untouched', async () => {
    for (const id of ['setup', 'pkg', 'git', 'script'])
      expect((await call('PUT', `/__slide-ng/monaco/${id}`, { content: 'pwned' })).status, id).toBe(
        403,
      );
    expect(readFileSync(join(root, 'setup/shiki.ts'), 'utf8')).toBe('export default {};\n');
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe('{}\n');
    expect(readFileSync(join(root, '.git/hooks/pre-commit'), 'utf8')).toBe('#!/bin/sh\n');
    expect(readFileSync(join(root, 'run.sh'), 'utf8')).toBe('#!/bin/sh\n');
  });
  it('does not create files that are listed but missing', async () => {
    expect((await call('PUT', '/__slide-ng/monaco/gone', { content: 'x' })).status).toBe(403);
    expect(existsSync(join(root, 'missing.ts'))).toBe(false);
  });
  it('refuses a path given in the address', async () => {
    expect(
      (await call('PUT', '/__slide-ng/monaco/..%2F..%2Fetc%2Fpasswd', { content: 'x' })).status,
    ).toBe(404);
    expect(
      (await call('PUT', '/__slide-ng/monaco/../../etc/passwd', { content: 'x' })).status,
    ).toBe(404);
  });
  it('refuses huge text', async () => {
    expect(
      await statusOf(call('PUT', '/__slide-ng/monaco/abc123', { content: 'x'.repeat(600_000) })),
    ).toBe(413);
  });
});

describe('drawings', () => {
  const drawing = (no: string | number, svg: unknown, headers = {}) =>
    call('PUT', `/__slide-ng/drawings/${no}`, { svg }, headers);
  it('writes the file of a slide and deletes it for an empty drawing', async () => {
    expect((await drawing(1, '<path d="M0 0L10 10" stroke="red"/>')).status).toBe(200);
    const file = join(root, '.slide-ng/drawings/1.svg');
    expect(readFileSync(file, 'utf8')).toContain('<path d="M0 0L10 10"');
    expect((await drawing(1, '')).status).toBe(200);
    expect(existsSync(file)).toBe(false);
  });
  it('refuses scripts, event handlers and links', async () => {
    for (const bad of [
      '<script>alert(1)</script>',
      '<path onclick="x()"/>',
      '<a href="x"><path/></a>',
      '<path style="fill:url(http://evil/x)"/>',
      '<image href="x"/>',
      '<!-- x -->',
      '<path/onclick=alert(1) d="M0 0"/>',
      '<path d="M0 0"onmouseover=alert(1)/>',
    ]) {
      expect((await drawing(1, bad)).status).toBe(422);
    }
    expect(existsSync(join(root, '.slide-ng/drawings/1.svg'))).toBe(false);
  });
  it('takes a marker with url(#id)', async () => {
    expect(
      (
        await drawing(
          2,
          '<defs><marker id="m"><path d="M0 0"/></marker></defs><line marker-end="url(#m)"/>',
        )
      ).status,
    ).toBe(200);
  });
  it('only accepts numbers of slides that exist, and never a name', async () => {
    expect((await drawing(3, '<path/>')).status).toBe(400);
    expect((await drawing('..%2F..%2Fx', '<path/>')).status).toBe(404);
    expect((await drawing('1.svg', '<path/>')).status).toBe(404);
  });
  it('refuses huge drawings', async () => {
    expect(await statusOf(drawing(1, `<path d="${'M0 0'.repeat(200_000)}"/>`))).toBe(413);
  });
});

describe('WebSocket', () => {
  const open = (query: string, headers: Record<string, string> = {}) =>
    new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${port}/__slide-ng/ws${query}`, { headers });
      ws.on('open', () => resolve(ws));
      ws.on('unexpected-response', (_req, res) => reject(new Error(String(res.statusCode))));
      ws.on('error', reject);
    });
  const next = (ws: WebSocket) =>
    new Promise<string>((resolve) => ws.once('message', (m) => resolve(m.toString())));

  it('refuses a wrong token, no token and a foreign Origin', async () => {
    await expect(open('?token=wrong')).rejects.toThrow('403');
    await expect(open('')).rejects.toThrow('403');
    await expect(open('?token=tok', { origin: 'http://evil.example' })).rejects.toThrow('403');
    await expect(open('?token=tok', { host: 'evil.example' })).rejects.toThrow('403');
  });
  it('passes a message to the other clients, not back to the sender', async () => {
    const a = await open('?token=tok'),
      b = await open('?token=tok');
    const got = next(b);
    let echoed = false;
    a.on('message', () => (echoed = true));
    a.send(JSON.stringify({ channel: 'shared', data: { page: 2 } }));
    expect(JSON.parse(await got)).toEqual({ channel: 'shared', data: { page: 2 } });
    await new Promise((r) => setTimeout(r, 100));
    expect(echoed).toBe(false);
    a.close();
    b.close();
  });
  it('drops messages that are not the app protocol', async () => {
    const a = await open('?token=tok'),
      b = await open('?token=tok');
    const seen: string[] = [];
    b.on('message', (m) => seen.push(m.toString()));
    for (const bad of ['not json', '{"channel":"evil","data":1}', '{"data":1}', '[]']) a.send(bad);
    a.send(JSON.stringify({ channel: 'hello', data: 1 }));
    await new Promise((r) => setTimeout(r, 200));
    expect(seen).toEqual(['{"channel":"hello","data":1}']);
    a.close();
    b.close();
  });
  it('closes the connection of a client that sends a huge message', async () => {
    const a = await open('?token=tok');
    const closed = new Promise<number>((resolve) => a.on('close', (code) => resolve(code)));
    a.send(JSON.stringify({ channel: 'drawings', data: 'x'.repeat(700_000) }));
    expect(await closed).toBe(1009);
  });
});

describe('--remote with a password', () => {
  let remotePort: number, stop: () => void;
  const ask = (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) => callOn(remotePort, method, path, body, { 'x-slide-ng-token': 'tok2', ...headers });
  let cookie = '';

  beforeAll(async () => {
    const remote = readConfig(
      { SLIDE_NG_TOKEN: 'tok2', SLIDE_NG_PASSWORD: 'pw', SLIDE_NG_REMOTE: '1' },
      root,
    );
    const started = await startServer({ ...remote, port: 0 });
    remotePort = started.port;
    stop = () => {
      started.server.close();
      started.hub.close();
    };
  });
  afterAll(() => stop());

  it('refuses the session and every write without the password cookie', async () => {
    expect((await ask('GET', '/__slide-ng/session')).status).toBe(401);
    expect(
      (await ask('POST', '/__slide-ng/slides/1/drag', { site: 0, pos: '1,2,3,4' })).status,
    ).toBe(401);
    expect(readFileSync(join(root, 'slides.md'), 'utf8')).toBe(SLIDES);
  });
  it('refuses a wrong password', async () => {
    const r = await ask('POST', '/__slide-ng/login', { password: 'nope' });
    expect(r.status).toBe(401);
    expect(r.headers['set-cookie']).toBeUndefined();
  });
  it('gives a cookie for the right password', async () => {
    const r = await ask('POST', '/__slide-ng/login', { password: 'pw' });
    expect(r.status).toBe(200);
    cookie = String(r.headers['set-cookie']).split(';')[0];
    expect(String(r.headers['set-cookie'])).toMatch(/HttpOnly.*SameSite=Strict/);
    expect(cookie).not.toContain('pw');
  });
  it('the cookie is short lived and different for every login', async () => {
    const a = await ask('POST', '/__slide-ng/login', { password: 'pw' });
    const b = await ask('POST', '/__slide-ng/login', { password: 'pw' });
    const header = String(a.headers['set-cookie']);
    expect(Number(/Max-Age=(\d+)/.exec(header)?.[1])).toBeLessThanOrEqual(8 * 3600);
    expect(Number(/Max-Age=(\d+)/.exec(header)?.[1])).toBeGreaterThan(0);
    expect(String(a.headers['set-cookie']).split(';')[0]).not.toBe(
      String(b.headers['set-cookie']).split(';')[0],
    );
  });
  it('locks a client out after repeated wrong passwords, also for the right one, but not others', async () => {
    const from = (ip: string) => ({ 'x-forwarded-for': ip });
    for (let i = 0; i < 5; i++)
      expect(
        (await ask('POST', '/__slide-ng/login', { password: `bad${i}` }, from('9.9.9.9'))).status,
      ).toBe(401);
    const locked = await ask('POST', '/__slide-ng/login', { password: 'pw' }, from('9.9.9.9'));
    expect(locked.status).toBe(429);
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
    expect(locked.headers['set-cookie']).toBeUndefined();
    // What the client wrote before the last entry is ignored: the proxy adds the real address last.
    const dodge = await ask(
      'POST',
      '/__slide-ng/login',
      { password: 'pw' },
      from('1.2.3.4, 9.9.9.9'),
    );
    expect(dodge.status).toBe(429);
    const other = await ask('POST', '/__slide-ng/login', { password: 'pw' }, from('8.8.8.8'));
    expect(other.status).toBe(200);
  });
  it('then hands out the token and accepts writes that have it', async () => {
    expect((await ask('GET', '/__slide-ng/session', undefined, { cookie })).json.token).toBe(
      'tok2',
    );
    expect(
      (
        await ask(
          'POST',
          '/__slide-ng/slides/1/drag',
          { site: 0, pos: '1,2,3,4' },
          { cookie, 'x-slide-ng-token': 'bad' },
        )
      ).status,
    ).toBe(403);
    expect(
      (await ask('POST', '/__slide-ng/slides/1/drag', { site: 0, pos: '5,6,7,8' }, { cookie }))
        .status,
    ).toBe(200);
    writeFileSync(join(root, 'slides.md'), SLIDES);
  });
  it('a forged cookie does not work', async () => {
    expect(
      (await ask('GET', '/__slide-ng/session', undefined, { cookie: 'slide-ng-auth=pw' })).status,
    ).toBe(401);
  });
  it('the login page checks Host and Origin as well', async () => {
    expect(
      (
        await ask(
          'POST',
          '/__slide-ng/login',
          { password: 'pw' },
          { origin: 'http://evil.example' },
        )
      ).status,
    ).toBe(403);
    expect(
      (await ask('POST', '/__slide-ng/login', { password: 'pw' }, { host: 'evil.example' })).status,
    ).toBe(403);
  });
  it('accepts a network address as Host (that is how other devices come in), and a local one is the same', async () => {
    expect(
      (
        await ask('GET', '/__slide-ng/session', undefined, {
          cookie,
          host: '192.168.1.20:4230',
          origin: 'http://192.168.1.20:4230',
        })
      ).status,
    ).toBe(200);
  });
  it('without --remote a network address as Host is refused', async () => {
    expect(
      (await call('GET', '/__slide-ng/session', undefined, { host: '192.168.1.20:4230' })).status,
    ).toBe(403);
  });
  it('refuses a WebSocket without the cookie, accepts it with', async () => {
    const connect = (headers: Record<string, string>) =>
      new Promise<string>((resolve) => {
        const ws = new WebSocket(`ws://127.0.0.1:${remotePort}/__slide-ng/ws?token=tok2`, {
          headers,
        });
        ws.on('open', () => {
          ws.close();
          resolve('open');
        });
        ws.on('unexpected-response', (_req: unknown, res: { statusCode: number }) =>
          resolve(String(res.statusCode)),
        );
        ws.on('error', () => resolve('error'));
      });
    expect(await connect({})).toBe('401');
    expect(await connect({ cookie: 'slide-ng-auth=wrong' })).toBe('401');
    expect(await connect({ cookie })).toBe('open');
  });
});

describe('drawings with a symlinked .slide-ng', () => {
  it('refuses to write through the link', async () => {
    const victim = mkdtempSync(join(tmpdir(), 'slide-ng-victim-'));
    const deck = mkdtempSync(join(tmpdir(), 'slide-ng-linkdeck-'));
    writeFileSync(join(deck, 'slides.md'), SLIDES);
    symlinkSync(victim, join(deck, '.slide-ng'));
    const started = await startServer({ ...readConfig({ SLIDE_NG_TOKEN: 'tk' }, deck), port: 0 });
    try {
      const r = await new Promise<number>((resolve, reject) => {
        const req = request(
          {
            host: '127.0.0.1',
            port: started.port,
            method: 'PUT',
            path: '/__slide-ng/drawings/1',
            headers: { 'content-type': 'application/json', 'x-slide-ng-token': 'tk' },
          },
          (res) => (res.resume(), resolve(res.statusCode!)),
        );
        req.on('error', reject);
        req.end(JSON.stringify({ svg: '<path d="M0 0L1 1"/>' }));
      });
      expect(r).toBe(403);
      expect(existsSync(join(victim, 'drawings'))).toBe(false);
    } finally {
      started.server.close();
      started.hub.close();
    }
  });
});
