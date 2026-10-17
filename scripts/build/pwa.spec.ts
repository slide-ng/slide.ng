import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestJson, pwaEnabled, serviceWorkerSource, shortName, writePwa } from './pwa.mjs';

describe('pwaEnabled', () => {
  it('is on for true and build only', () => {
    expect(pwaEnabled({ pwa: true })).toBe(true);
    expect(pwaEnabled({ pwa: 'build' })).toBe(true);
    expect(pwaEnabled({ pwa: 'dev' })).toBe(false);
    expect(pwaEnabled({ pwa: false })).toBe(false);
    expect(pwaEnabled({})).toBe(false);
  });
});

describe('manifestJson', () => {
  it('names the app after the deck and has no icons unless some exist', () => {
    const m = manifestJson({ title: 'My talk about everything' });
    expect(m.name).toBe('My talk about everything');
    expect(m.short_name.length).toBeLessThanOrEqual(12);
    expect(m.start_url).toBe('./');
    expect(m).not.toHaveProperty('icons');
  });
  it('lists the icons that exist, with size, type and purpose', () => {
    const m = manifestJson({ title: 'T' }, [
      'pwa-icon-192.png',
      'pwa-icon-512.png',
      'pwa-icon-maskable-512.png',
      'other.png',
    ]);
    expect(m.icons).toEqual([
      { src: 'pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: 'pwa-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
    expect(manifestJson({}, ['pwa-icon-192.png']).icons).toHaveLength(1);
  });
});

describe('serviceWorkerSource', () => {
  it('lists the files and names the cache', () => {
    const text = serviceWorkerSource(['index.html', 'a/b.js'], 'v1');
    expect(text).toContain("'slide-ng-v1'");
    expect(text).toContain('["index.html","a/b.js"]');
    expect(() => new Function(text)).not.toThrow(); // it is valid JavaScript
  });
});

describe('writePwa', () => {
  it('writes the manifest and a worker that stores every file but downloads and itself', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-pwa-'));
    mkdirSync(join(dir, 'remote-assets'));
    for (const f of [
      'index.html',
      'main.js',
      'talk.pdf',
      'og-image.png',
      '.slide-ng-build',
      'remote-assets/a.png',
    ])
      writeFileSync(join(dir, f), 'x');
    const count = writePwa(dir, { title: 'T' });
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    expect(count).toBe(4);
    for (const f of ['index.html', 'main.js', 'remote-assets/a.png', 'manifest.webmanifest'])
      expect(sw).toContain(`"${f}"`);
    for (const f of ['talk.pdf', 'og-image.png', 'slide-ng-build']) expect(sw).not.toContain(f);
    expect(JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8')).name).toBe('T');
  });
  it('lists icons found in the build in the manifest and the cache', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-pwa-'));
    for (const f of ['index.html', 'pwa-icon-192.png', 'pwa-icon-512.png'])
      writeFileSync(join(dir, f), 'x');
    writePwa(dir, { title: 'T' });
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.webmanifest'), 'utf8'));
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual([
      'pwa-icon-192.png',
      'pwa-icon-512.png',
    ]);
    const sw = readFileSync(join(dir, 'sw.js'), 'utf8');
    expect(sw).toContain('"pwa-icon-192.png"');
    expect(sw).toContain('"pwa-icon-512.png"');
  });
  it('changes the cache name when a file changes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-pwa-'));
    writeFileSync(join(dir, 'index.html'), 'a');
    writePwa(dir, {});
    const first = /slide-ng-(\w+)'/.exec(readFileSync(join(dir, 'sw.js'), 'utf8'))![1];
    writeFileSync(join(dir, 'index.html'), 'a longer file');
    writePwa(dir, {});
    expect(/slide-ng-(\w+)'/.exec(readFileSync(join(dir, 'sw.js'), 'utf8'))![1]).not.toBe(first);
  });
  it('changes the cache name when a file changes without changing its length', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-pwa-'));
    writeFileSync(join(dir, 'main.js'), 'if (a > 1) go();');
    writePwa(dir, {});
    const version = () => /slide-ng-(\w+)'/.exec(readFileSync(join(dir, 'sw.js'), 'utf8'))![1];
    const first = version();
    writePwa(dir, {});
    expect(version()).toBe(first); // the same files give the same name
    writeFileSync(join(dir, 'main.js'), 'if (a < 1) go();'); // one character, same length
    writePwa(dir, {});
    expect(version()).not.toBe(first);
  });
});

describe('manifest names and colours', () => {
  it('cuts the short name between words', () => {
    expect(shortName('Blueprints for the web')).toBe('Blueprints');
    expect(shortName('Short')).toBe('Short');
    expect(shortName('Supercalifragilistic')).toBe('Supercalifra');
  });
  it('takes themeColor and the colour schema', () => {
    const m = manifestJson({ title: 'x', themeColor: '#0f2c4c', colorSchema: 'dark' });
    expect([m.theme_color, m.background_color]).toEqual(['#0f2c4c', '#121212']);
    expect(manifestJson({ title: 'x', themeColor: 'red;}' }).theme_color).toBe('#16131A');
  });
});
