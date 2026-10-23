import { sandboxEnabled } from './browser.mjs';
import { requestFilter } from './request-filter.mjs';

const own = 'http://127.0.0.1:5000';
const table: Record<string, string[]> = {
  'cdn.example.com': ['93.184.216.34'],
  'sneaky.example.com': ['93.184.216.34', '127.0.0.1'],
  'intranet.example.com': ['10.0.0.7'],
};
const lookup = async (host: string) => {
  if (!table[host]) throw new Error('ENOTFOUND');
  return table[host].map((address) => ({ address }));
};

describe('requestFilter', () => {
  const allowed = requestFilter({ ownOrigin: own, lookup });
  it('lets the exporter own server, public hosts and inline data through', async () => {
    for (const url of [
      `${own}/slide/1`,
      'https://cdn.example.com/a.png',
      'https://8.8.8.8/x',
      'data:image/png;base64,AAAA',
      'blob:http://127.0.0.1:5000/abc',
      'about:blank',
    ])
      expect(await allowed(url), url).toBe(true);
  });
  it('blocks loopback, private, link-local and metadata addresses, also by name', async () => {
    for (const url of [
      'http://127.0.0.1:5432/',
      'http://127.0.0.1:5001/', // another port than ours is another service
      'http://localhost:3000/',
      'http://app.localhost/',
      'http://192.168.0.1/admin',
      'http://10.1.1.1/',
      'http://169.254.169.254/latest/meta-data/',
      'http://[::1]/',
      'http://2130706433/',
      'http://printer.local/',
      'https://intranet.example.com/',
      'https://sneaky.example.com/', // one private answer is enough
      'ws://127.0.0.1:9229/',
    ])
      expect(await allowed(url), url).toBe(false);
  });
  it('blocks file: and ftp:', async () => {
    expect(await allowed('file:///etc/passwd')).toBe(false);
    expect(await allowed('ftp://x.test/a')).toBe(false);
  });
  it('allowLocal lets everything through', async () => {
    const open = requestFilter({ ownOrigin: own, allowLocal: true, lookup });
    expect(await open('http://169.254.169.254/')).toBe(true);
  });
});

describe('sandboxEnabled', () => {
  // The browser suites run with SLIDE_NG_NO_SANDBOX=1, so each case sets the variable itself instead of inheriting it.
  const before = process.env['SLIDE_NG_NO_SANDBOX'];
  afterEach(() => {
    if (before === undefined) delete process.env['SLIDE_NG_NO_SANDBOX'];
    else process.env['SLIDE_NG_NO_SANDBOX'] = before;
  });

  it('keeps the sandbox by default and drops it only on request', () => {
    delete process.env['SLIDE_NG_NO_SANDBOX'];
    expect(sandboxEnabled({})).toBe(true);
    expect(sandboxEnabled({ noSandbox: false })).toBe(true);
    expect(sandboxEnabled({ noSandbox: true })).toBe(false);
  });

  it('drops the sandbox when SLIDE_NG_NO_SANDBOX=1', () => {
    process.env['SLIDE_NG_NO_SANDBOX'] = '1';
    expect(sandboxEnabled({})).toBe(false);
    process.env['SLIDE_NG_NO_SANDBOX'] = '0';
    expect(sandboxEnabled({})).toBe(true);
  });
});
