import { twoslashReason } from './render-code.mjs';

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
