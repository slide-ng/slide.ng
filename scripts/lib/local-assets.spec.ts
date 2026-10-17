// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localAssets } from './local-assets.mjs';

describe('localAssets', () => {
  const root = mkdtempSync(join(tmpdir(), 'local-assets-'));
  mkdirSync(join(root, 'images'));
  mkdirSync(join(root, 'public', 'pub'), { recursive: true });
  writeFileSync(join(root, 'images', 'a b.png'), 'x');
  writeFileSync(join(root, 'public', 'pub', 'p.png'), 'x');
  const ctx = { file: join(root, 'slides.md'), root, publics: [join(root, 'public')] };

  it('serves a relative file next to slides.md from _local', () => {
    const found = new Set<string>();
    expect(localAssets('<img src="./images/a%20b.png">', ctx, found)).toBe(
      '<img src="/_local/images/a%20b.png">',
    );
    expect([...found]).toEqual(['images/a b.png']);
  });
  it('leaves files in public, missing files and files outside the deck', () => {
    const found = new Set<string>();
    const html =
      '<img src="./pub/p.png"><img src="./nope.png"><img src="../../etc/passwd"><img src="./50%.png">';
    expect(localAssets(html, ctx, found)).toBe(html);
    expect(found.size).toBe(0);
  });
});
