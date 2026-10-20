import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkDrift,
  describeDrift,
  hashFile,
  hashSources,
  parseManifest,
  updatedGeneration,
} from './hash.mjs';

const REPO = process.cwd().replace(/\/$/, '');
const manifest = {
  algorithm: 'sha256',
  files: {
    'SKILL.md': { sources: { 'README.md': '' }, hash: '' },
    'references/core-a.md': { sources: { 'docs/A.md': '', 'docs/B.md': '' }, hash: '' },
  },
};
const generation = `# Generation

<!-- skills-table:begin -->
<!-- skills-table:end -->

<!-- skills-hash:begin -->
\`\`\`json
${JSON.stringify(manifest, null, 2)}
\`\`\`
<!-- skills-hash:end -->
`;

let root: string;
const put = (path: string, text: string) => {
  mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, path), text);
};
const script = (name: string) =>
  spawnSync(process.execPath, [join(REPO, 'scripts', name), '--root', root], { encoding: 'utf8' });

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'slide-ng-drift-'));
  put('README.md', 'readme');
  put('docs/A.md', 'a');
  put('docs/B.md', 'b');
  put('skills/slide-ng/SKILL.md', '---\nname: slide-ng\n---\n');
  put('skills/slide-ng/references/core-a.md', 'ref');
  put('skills/GENERATION.md', generation);
});

describe('hashing', () => {
  it('ignores line endings and tells different text apart', () => {
    put('docs/crlf.md', 'a\r\nb\r\n');
    put('docs/lf.md', 'a\nb\n');
    expect(hashFile(root, 'docs/crlf.md')).toBe(hashFile(root, 'docs/lf.md'));
    expect(hashFile(root, 'docs/A.md')).not.toBe(hashFile(root, 'docs/B.md'));
  });
  it('ignores the all-contributors table of a README', () => {
    const table = (who: string) =>
      `# Project\n\n<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->\n${who}\n<!-- ALL-CONTRIBUTORS-LIST:END -->\n\nEnd.\n`;
    put('docs/one.md', table('one person'));
    put('docs/two.md', table('two people'));
    put('docs/other.md', table('two people').replace('End.', 'Other.'));
    expect(hashFile(root, 'docs/one.md')).toBe(hashFile(root, 'docs/two.md'));
    expect(hashFile(root, 'docs/one.md')).not.toBe(hashFile(root, 'docs/other.md'));
  });
  it('does not depend on the order of the sources, but on their names and contents', () => {
    expect(hashSources(root, ['docs/A.md', 'docs/B.md'])).toBe(
      hashSources(root, ['docs/B.md', 'docs/A.md']),
    );
    expect(hashSources(root, ['docs/A.md'])).not.toBe(hashSources(root, ['docs/B.md']));
  });
});

describe('the manifest', () => {
  it('is read from GENERATION.md and refused when it is broken', () => {
    expect(parseManifest(generation).files['SKILL.md'].sources).toEqual({ 'README.md': '' });
    expect(() => parseManifest('no block')).toThrow('no <!-- skills-hash:begin -->');
  });
  it('is written back with the table of sources', () => {
    const text = updatedGeneration(root);
    expect(text).toContain('| `references/core-a.md` | `docs/A.md`, `docs/B.md` |');
    expect(parseManifest(text).files['references/core-a.md'].sources['docs/A.md']).toBe(
      hashFile(root, 'docs/A.md'),
    );
  });
});

describe('checkDrift', () => {
  it('finds every file stale before the hashes are recorded', () => {
    expect(checkDrift(root).stale.map((s) => s.file)).toEqual([
      'skills/slide-ng/SKILL.md',
      'skills/slide-ng/references/core-a.md',
    ]);
  });
  it('is clean after an update, and names the stale file when a source changes', () => {
    writeFileSync(join(root, 'skills/GENERATION.md'), updatedGeneration(root));
    expect(checkDrift(root)).toEqual({ stale: [], problems: [] });
    put('docs/B.md', 'b changed');
    const result = checkDrift(root);
    expect(result.stale).toEqual([
      { file: 'skills/slide-ng/references/core-a.md', changed: ['docs/B.md'] },
    ]);
    expect(describeDrift(result)).toContain('npm run update:skills-hash');
  });
  it('reports a reference that is not listed, a listed file that is gone, and a missing source', () => {
    writeFileSync(join(root, 'skills/GENERATION.md'), updatedGeneration(root));
    put('skills/slide-ng/references/new.md', 'new');
    expect(checkDrift(root).problems).toEqual([
      'skills/slide-ng/references/new.md is not listed in skills/GENERATION.md',
    ]);
    rmSync(join(root, 'skills/slide-ng/references/core-a.md'));
    rmSync(join(root, 'docs/B.md'));
    const result = checkDrift(root);
    expect(result.problems.join()).toContain('lists skills/slide-ng/references/core-a.md');
    expect(result.stale[0].changed).toEqual(['docs/B.md (missing)']);
  });
});

describe('the scripts', () => {
  it('check exits 1 and lists the stale reference, update makes it pass again', () => {
    expect(script('update-skills-hash.mjs').status).toBe(0);
    const ok = script('check-skills-drift.mjs');
    expect(ok.status).toBe(0);
    put('docs/A.md', 'a, edited');
    const failed = script('check-skills-drift.mjs');
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('skills/slide-ng/references/core-a.md');
    expect(failed.stderr).toContain('docs/A.md');
    expect(readFileSync(join(root, 'skills/GENERATION.md'), 'utf8')).toContain('"sha256"');
    expect(script('update-skills-hash.mjs').stdout).toContain('core-a.md');
    expect(script('check-skills-drift.mjs').status).toBe(0);
  });
  it('check fails for a file that is not listed', () => {
    script('update-skills-hash.mjs');
    put('skills/slide-ng/references/extra.md', 'x');
    const failed = script('check-skills-drift.mjs');
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('extra.md is not listed');
  });
});
