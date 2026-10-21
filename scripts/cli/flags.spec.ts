import { describe, expect, it } from 'vitest';
import { applyLangFlag, parseFlags } from './flags.mjs';

const spec = {
  port: { type: 'number', alias: 'p' },
  open: { type: 'boolean', alias: 'o' },
  format: { type: 'string' },
  remote: { type: 'optional' },
};

describe('parseFlags', () => {
  it('does not take the next flag as a value', () => {
    expect(() => parseFlags(['--format', '--open'], spec)).toThrow('--format needs a value');
    expect(parseFlags(['--format=--open'], spec).flags).toEqual({ format: '--open' });
  });
  it('reads values after a space or an equals sign', () => {
    expect(parseFlags(['--port', '3030', '--format=png'], spec).flags).toEqual({
      port: 3030,
      format: 'png',
    });
  });
  it('reads aliases and booleans', () => {
    expect(parseFlags(['-p', '1', '-o'], spec).flags).toEqual({ port: 1, open: true });
    expect(parseFlags(['--open=false'], spec).flags).toEqual({ open: false });
    expect(parseFlags(['--no-open'], spec).flags).toEqual({ open: false });
  });
  it('an optional value is only taken with an equals sign', () => {
    expect(parseFlags(['--remote', 'my.md'], spec)).toEqual({
      flags: { remote: true },
      positionals: ['my.md'],
    });
    expect(parseFlags(['--remote=pw'], spec).flags).toEqual({ remote: 'pw' });
  });
  it('keeps positionals and everything after --', () => {
    const r = parseFlags(['my.md', '--open', '--', '--port', 'x'], spec);
    expect(r.positionals).toEqual(['my.md', '--port', 'x']);
    expect(r.flags).toEqual({ open: true });
  });
  it('refuses unknown flags, missing values and bad numbers', () => {
    expect(() => parseFlags(['--nope'], spec)).toThrow('Unknown flag --nope');
    expect(() => parseFlags(['-z'], spec)).toThrow('Unknown flag -z');
    expect(() => parseFlags(['--prot', '3000'], spec)).toThrow(
      'Unknown flag --prot. Did you mean --port?',
    );
    expect(() => parseFlags(['--format'], spec)).toThrow('needs a value');
    expect(() => parseFlags(['--port', 'abc'], spec)).toThrow('must be a number');
  });
});

describe('applyLangFlag', () => {
  it('sets the language for the generator, spelled the usual way, and refuses what is not a tag', () => {
    const before = process.env['SLIDE_NG_LANG'];
    try {
      applyLangFlag({ lang: 'pt_br' });
      expect(process.env['SLIDE_NG_LANG']).toBe('pt-BR');
      expect(() => applyLangFlag({ lang: '../tr' })).toThrow(/--lang must be a language tag/);
    } finally {
      if (before === undefined) delete process.env['SLIDE_NG_LANG'];
      else process.env['SLIDE_NG_LANG'] = before;
    }
  });
});
