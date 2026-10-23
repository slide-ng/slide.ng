import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCommand, fillTemplate, packageName } from './create.mjs';

describe('packageName', () => {
  it('makes a valid npm name from a folder', () => {
    expect(packageName('/x/My Talk 2026')).toBe('my-talk-2026');
    expect(packageName('/x/@@@')).toBe('my-slides');
    expect(packageName('/x/.hidden_')).toBe('hidden');
  });
});

describe('fillTemplate', () => {
  it('fills known holes and leaves unknown ones', () => {
    expect(fillTemplate('a {{name}} b {{other}}', { name: 'x' })).toBe('a x b {{other}}');
  });
});

describe('createCommand', () => {
  it('writes the template into a new folder, with the name filled in and a .gitignore', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'slide-ng-create-')), 'My Deck');
    await createCommand([dir], process.cwd());
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('my-deck');
    expect(pkg.dependencies['@slide-ng/core']).toMatch(/^\^\d/);
    expect(readdirSync(dir)).toEqual(
      expect.arrayContaining(['slides.md', 'package.json', '.gitignore', 'README.md']),
    );
    expect(existsSync(join(dir, '_gitignore'))).toBe(false);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toContain('# my-deck');
  });
  it('refuses a folder that has files, and keeps them with --force', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-create-'));
    writeFileSync(join(dir, 'slides.md'), 'mine');
    await expect(createCommand([dir], process.cwd())).rejects.toThrow('is not empty');
    await createCommand([dir, '--force'], process.cwd());
    expect(readFileSync(join(dir, 'slides.md'), 'utf8')).toBe('mine');
    expect(existsSync(join(dir, 'package.json'))).toBe(true);
  });
  it('with --force, fills in only the files it adds and keeps an existing .gitignore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-create-'));
    writeFileSync(join(dir, 'README.md'), 'Hello {{name}}');
    writeFileSync(join(dir, '.gitignore'), 'mine\n');
    await createCommand([dir, '--force'], process.cwd());
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('Hello {{name}}');
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toBe('mine\n');
    expect(existsSync(join(dir, '_gitignore'))).toBe(false);
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name).not.toContain('{{');
  });
  it('ignores the files that export writes by default', async () => {
    const dir = join(mkdtempSync(join(tmpdir(), 'slide-ng-create-')), 'talk');
    await createCommand([dir], process.cwd());
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toContain('*-export.*');
  });
  it('needs a folder name', async () => {
    await expect(createCommand([], process.cwd())).rejects.toThrow('Usage');
  });
});
