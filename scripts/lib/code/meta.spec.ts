import { cleanTitle, parseInfo, parseMonacoInfo, parseOptions, splitRanges } from './meta.mjs';

describe('fence info', () => {
  it('reads language, title, ranges and options', () => {
    const r = parseInfo("ts [app.ts] {2,3|5|all} {lines:true,maxHeight:'100px'}");
    expect(r.lang).toBe('ts');
    expect(r.title).toBe('app.ts');
    expect(r.ranges).toEqual(['2,3', '5', 'all']);
    expect(r.options).toEqual({ lines: true, maxHeight: '100px' });
  });
  it('allows no ranges and no options', () => {
    expect(parseInfo('js')).toMatchObject({ lang: 'js', title: '', ranges: [], options: {} });
    expect(parseInfo('')).toMatchObject({ lang: '', ranges: [] });
  });
  it('reads options without ranges', () => {
    expect(parseInfo('ts {lines:true,startLine:5}').options).toEqual({ lines: true, startLine: 5 });
  });
  it('reads {*} and hide/none ranges', () => {
    expect(parseInfo('ts {*}{lines:true}').ranges).toEqual(['*']);
    expect(splitRanges('hide|none')).toEqual(['hide', 'none']);
  });
});

describe('options', () => {
  it('converts true, false, numbers, quotes and bare words', () => {
    expect(parseOptions('{a:true, b:false, c: 3, d:\'x y\', e:"z", f:200px}')).toEqual({
      a: true,
      b: false,
      c: 3,
      d: 'x y',
      e: 'z',
      f: '200px',
    });
  });
  it('keeps a comma inside quotes', () => {
    expect(parseOptions("{title:'a, b'}")).toEqual({ title: 'a, b' });
    expect(parseOptions('{a: [1, 2}')).toEqual({ a: [1, 2] }); // a list left open ends (it used to loop forever)
  });
  it('reads nested objects and lists, as Mermaid options use them', () => {
    expect(parseOptions('{sequence: {mirrorActors: false}, scale: 0.7, ids: [1, 2]}')).toEqual({
      sequence: { mirrorActors: false },
      scale: 0.7,
      ids: [1, 2],
    });
    expect(parseInfo('mermaid {sequence: {mirrorActors: false}}').options).toEqual({
      sequence: { mirrorActors: false },
    });
  });
});

describe('titles and monaco info', () => {
  it('drops the ~icon~ part of a title', () => {
    expect(cleanTitle('npm ~i-uil:github~')).toBe('npm');
  });
  it('reads {monaco}, {monaco-diff} and {monaco-run} with options', () => {
    expect(parseMonacoInfo('ts {monaco-run} {autorun:false}')).toEqual({
      lang: 'ts',
      kind: 'monaco-run',
      options: { autorun: false },
    });
    expect(parseMonacoInfo('ts {2,3}')).toBeNull();
  });
});
