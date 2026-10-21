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
      message: 'a quote is not closed',
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
