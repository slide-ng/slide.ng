// @vitest-environment node
import { appendFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { watchFolder } from './watch-folder.mjs';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Waits until `seen` holds a new entry ending in `name` (the events of one step are not counted in the next).
async function waitFor(seen: string[], name: string) {
  for (let i = 0; i < 100; i++) {
    const at = seen.findIndex((s) => s.endsWith(name));
    if (at >= 0) return seen.splice(0, at + 1).length > 0;
    await sleep(30);
  }
  return false;
}

// An editor's atomic save: the new text goes to another file that is then renamed over the old one.
function atomicSave(file: string, text: string) {
  writeFileSync(`${file}.tmp~`, text);
  renameSync(`${file}.tmp~`, file);
}

describe('watchFolder', () => {
  let close = () => {};
  afterEach(() => close());
  const start = (dir: string, tree: boolean) => {
    const seen: string[] = [];
    close = watchFolder(
      dir,
      (folder: string, name: string | null) => seen.push(join(folder, name ?? '<again>')),
      {
        tree,
      },
    ).close;
    return seen;
  };

  it('keeps reporting a file in a folder below after it was saved by a rename', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'watch-'));
    mkdirSync(join(dir, 'components'));
    const file = join(dir, 'components/card.ts');
    writeFileSync(file, 'a');
    const seen = start(dir, true);
    atomicSave(file, 'b');
    expect(await waitFor(seen, 'components/card.ts')).toBe(true);
    await sleep(150);
    seen.length = 0;
    appendFileSync(file, '// c');
    expect(await waitFor(seen, 'components/card.ts')).toBe(true);
    atomicSave(file, 'd');
    await sleep(150);
    seen.length = 0;
    appendFileSync(file, '// e');
    expect(await waitFor(seen, 'components/card.ts')).toBe(true);
  });

  it('watches a folder made after the start', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'watch-'));
    const seen = start(dir, true);
    mkdirSync(join(dir, 'layouts'));
    await sleep(150);
    writeFileSync(join(dir, 'layouts/cover.ts'), 'a');
    expect(await waitFor(seen, 'layouts/cover.ts')).toBe(true);
  });

  it('watches a folder again after it was deleted and made again', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'watch-'));
    const dir = join(parent, 'pages/sub');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'part.md'), 'a');
    const seen = start(dir, false);
    rmSync(join(parent, 'pages'), { recursive: true });
    await sleep(200);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'part.md'), 'b');
    expect(await waitFor(seen, '<again>')).toBe(true);
    await sleep(150);
    seen.length = 0;
    writeFileSync(join(dir, 'part.md'), 'c');
    expect(await waitFor(seen, 'sub/part.md')).toBe(true);
  });

  it('starts watching a folder that is missing at the start once it is made', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'watch-'));
    const dir = join(parent, 'styles');
    const seen = start(dir, true);
    mkdirSync(dir);
    expect(await waitFor(seen, '<again>')).toBe(true);
    await sleep(100);
    writeFileSync(join(dir, 'index.css'), 'a');
    expect(await waitFor(seen, 'styles/index.css')).toBe(true);
  });
});
