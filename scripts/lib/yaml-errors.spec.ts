import { parseDocument } from 'yaml';
import { describe, expect, it } from 'vitest';
import { describeYamlError } from './yaml-errors.mjs';

const describeYaml = (raw: string, firstLine = 2) =>
  describeYamlError(parseDocument(raw).errors[0], raw, firstLine, 'frontmatter');

describe('describeYamlError', () => {
  it('gives the line of the file that has the error, also for a quote that is never closed', () => {
    expect(describeYaml('layout: center\nclass: big\nfoo: [x\n', 8)).toEqual({
      line: 10,
      message: 'a [ is not closed',
    });
    expect(describeYaml('layout: center\nclass: "big\n', 8)).toEqual({
      line: 9,
      message: 'the " that starts the value of "class" is never closed; add the closing "',
    });
  });
  it('names the line that opens a quote that is never closed, past values that close on a later line', () => {
    expect(describeYaml("title: 'Feature Flags\nlayout: cover\ninfo: x\n", 2)).toEqual({
      line: 2,
      message: `the ' that starts the value of "title" is never closed; add the closing '`,
    });
    expect(
      describeYaml("title: \"two\n  lines\"\nnote: 'it''s'\nx: \"open\nclass: a\n", 2),
    ).toEqual({
      line: 5,
      message: 'the " that starts the value of "x" is never closed; add the closing "',
    });
  });
  it('says in plain words what is wrong', () => {
    expect(describeYaml('title: a\ntitle: b\n').message).toBe('"title" is set twice');
    expect(describeYaml('x: {a: 1\n').message).toBe('a { is not closed');
    expect(describeYaml('title: ok\n  bad: indent\n').message).toBe(
      'the line after "title: ok" is indented more than it, or a value there has ": " in it and needs quotes',
    );
  });
});
