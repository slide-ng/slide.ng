import { remoteLines, remoteQrLines } from './remote-info.mjs';

describe('remoteLines', () => {
  it('shows a private address with the password', () => {
    const text = remoteLines({ port: 4230, password: 'sec ret', addresses: ['192.168.1.5'] }).join(
      '\n',
    );
    expect(text).toContain('public slide show:  http://192.168.1.5:4230/');
    expect(text).toContain('private slide show: http://192.168.1.5:4230/?password=sec%20ret');
    expect(text).toContain('presenter/1?password=sec%20ret');
  });
  it('puts the addresses after #/ for a deck with routerMode: hash', () => {
    const text = remoteLines({
      port: 4230,
      password: 'x y',
      routerMode: 'hash',
      addresses: ['192.168.1.5'],
    }).join('\n');
    expect(text).toContain('public slide show:  http://192.168.1.5:4230/#/\n');
    expect(text).toContain('private slide show: http://192.168.1.5:4230/#/?password=x%20y');
    expect(text).toContain(
      'presenter mode:     http://192.168.1.5:4230/#/presenter/1?password=x%20y',
    );
  });
  it('says what remote mode allows: editing slides and listed files, not only following', () => {
    const text = remoteLines({ port: 1, password: 'x', addresses: [] }).join('\n');
    expect(text).toContain('can edit your slides.md');
    expect(text).toContain('{monaco-write}');
    expect(text).toContain('no HTTPS');
    expect(text).not.toContain('WARNING: no password');
  });
  it('prints a generated password and the presenter address that carries it', () => {
    const text = remoteLines({
      port: 4230,
      password: 'gen-erated-pass-1234',
      generated: true,
      addresses: ['10.0.0.2'],
    }).join('\n');
    expect(text).toContain('no password was given: a random one was made for this run');
    expect(text).toContain('gen-erated-pass-1234');
    expect(text).toContain('http://10.0.0.2:4230/presenter/1?password=gen-erated-pass-1234');
  });
  it('notes that a password on the command line shows in the process list', () => {
    const text = remoteLines({ port: 1, password: 'x', fromArgv: true, addresses: [] }).join('\n');
    expect(text).toContain('SLIDE_NG_PASSWORD');
    expect(remoteLines({ port: 1, password: 'x', addresses: [] }).join('\n')).not.toContain(
      'process list',
    );
  });
  it('says so when there is no network address', () => {
    expect(remoteLines({ port: 1, password: 'x', addresses: [] }).join('\n')).toContain(
      '<your address>',
    );
  });
});

describe('remoteQrLines', () => {
  it('draws a QR code of the private address, password included, for each address', () => {
    const lines = remoteQrLines({
      port: 4230,
      password: 'a b',
      addresses: ['10.0.0.2', '10.0.0.3'],
    });
    const text = lines.join('\n');
    expect(text).toContain('http://10.0.0.2:4230/?password=a%20b');
    expect(text).toContain('http://10.0.0.3:4230/?password=a%20b');
    const code = lines[2].split('\n');
    expect(code.length).toBeGreaterThan(10);
    expect(code.every((row) => /^[ ▀▄█]+$/.test(row))).toBe(true);
  });
  it('encodes the hash address for a deck with routerMode: hash', () => {
    const text = remoteQrLines({
      port: 4230,
      password: 'p',
      routerMode: 'hash',
      addresses: ['10.0.0.2'],
    }).join('\n');
    expect(text).toContain('http://10.0.0.2:4230/#/?password=p');
  });
  it('says so when there is no address', () => {
    expect(remoteQrLines({ port: 1, password: 'x', addresses: [] })[0]).toContain(
      'no network address',
    );
  });
});
