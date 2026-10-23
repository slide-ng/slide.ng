import { missingErrors, rangeOutsideLines, twoslashReason } from './render-code.mjs';

describe('twoslashReason', () => {
  it("uses a Twoslash error's title and description (its message starts with an empty line)", () => {
    const e = Object.assign(
      new Error('\n## Invalid quick info query\n\nThe request on line 2 ...'),
      {
        title: 'Invalid quick info query',
        description: 'The request on line 2 ...',
      },
    );
    expect(twoslashReason(e)).toBe('Invalid quick info query: The request on line 2 ...');
  });

  it('takes the first line with text of another error', () => {
    expect(twoslashReason(new Error('\n\n## Something broke\nmore'))).toBe('Something broke');
    expect(twoslashReason(new Error(''))).toBe('unknown error');
  });
});

describe('rangeOutsideLines', () => {
  const code = 'a\nb\nc\nd\n';
  it('names a step that picks none of the numbers shown', () => {
    expect(rangeOutsideLines(['3-5'], code, 10)).toBe(
      'the line range {3-5} is outside the lines shown (10-13, with startLine:10), so it highlights no line; ranges use the numbers shown',
    );
    expect(rangeOutsideLines(['2', '9'], code)).toContain('{9} is outside the lines shown (1-4)');
  });
  it('accepts steps that pick a line, and the words all, hide and 0', () => {
    expect(rangeOutsideLines(['11,12', '13-20', 'all', '0', '*'], code, 10)).toBe('');
    expect(rangeOutsideLines(['1-2|4'.split('|')[0]], code)).toBe('');
  });
});

describe('missingErrors', () => {
  it('lists the @errors codes that TypeScript does not report', () => {
    const code = "// @errors: 2322 2588\nconst a: number = 'x';\n";
    expect(missingErrors(code, [{ code: 2322 }])).toEqual(['2588']);
    expect(missingErrors(code, [{ code: 2322 }, { code: 2588 }])).toEqual([]);
    expect(missingErrors('const a = 1;', [])).toEqual([]);
    expect(missingErrors('// @errors: 2322', undefined)).toEqual(['2322']);
  });
});
