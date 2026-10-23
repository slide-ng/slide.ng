// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generatorProblem } from './routes.mjs';

describe('generatorProblem', () => {
  const app = (problem: string, lastGood: boolean) => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-problem-'));
    mkdirSync(join(dir, 'src/slides/generated'), { recursive: true });
    writeFileSync(
      join(dir, 'src/slides/generated/problem.ts'),
      `export const PROBLEM = ${JSON.stringify(problem)};\nexport const LAST_GOOD = ${lastGood};\n`,
    );
    return dir;
  };
  it("gives the generator's error while the last good slides are kept", () => {
    expect(generatorProblem(app('slide 2: <div> is "never" closed', true))).toBe(
      'slide 2: <div> is "never" closed',
    );
  });
  it('gives nothing for missing src: files (the rest of the deck is shown), a good run or no file', () => {
    expect(generatorProblem(app('pages/x.md not found', false))).toBe('');
    expect(generatorProblem(app('', false))).toBe('');
    expect(generatorProblem(join(tmpdir(), 'no-such-app'))).toBe('');
  });
});
