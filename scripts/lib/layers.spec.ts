import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findLayerFiles, findLayers, layersSource } from './layers.mjs';

describe('findLayers', () => {
  it('finds only the files that exist, in a fixed order', () => {
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-layers-'));
    mkdirSync(dir, { recursive: true });
    for (const n of ['slide-top', 'global-bottom', 'other'])
      writeFileSync(join(dir, `${n}.ts`), '');
    expect(findLayers(dir)).toEqual(['global-bottom', 'slide-top']);
  });
  it('finds nothing in a missing folder', () => {
    expect(findLayers('/no/such/folder')).toEqual([]);
  });
});

describe('layersSource', () => {
  it('imports the found layers and makes the others null', () => {
    const src = layersSource(['global-top']);
    expect(src).toContain("import globalTop from '../../app/layers/global-top';");
    expect(src).toContain("'global-top': globalTop,");
    expect(src).toContain("'slide-bottom': null,");
  });
  it('knows the custom-nav-controls layer', () => {
    const src = layersSource(['custom-nav-controls']);
    expect(src).toContain("import customNavControls from '../../app/layers/custom-nav-controls';");
    expect(src).toContain("'custom-nav-controls': customNavControls,");
  });
  it('is valid with no layers at all', () => {
    expect(layersSource([])).not.toContain('import globalTop');
  });
});

describe('findLayerFiles', () => {
  it('lets a later folder win over an earlier one, per layer', () => {
    const a = mkdtempSync(join(tmpdir(), 'slide-ng-layers-'));
    const b = mkdtempSync(join(tmpdir(), 'slide-ng-layers-'));
    for (const n of ['global-top', 'slide-top']) writeFileSync(join(a, `${n}.ts`), '');
    writeFileSync(join(b, 'slide-top.ts'), '');
    expect(
      findLayerFiles([
        { dir: a, importDir: './roots/theme/layers' },
        { dir: b, importDir: './roots/deck/layers' },
      ]),
    ).toEqual({
      'global-top': './roots/theme/layers/global-top',
      'slide-top': './roots/deck/layers/slide-top',
    });
  });
  it('makes layers.ts from a map of import paths', () => {
    const src = layersSource({ 'slide-top': './roots/deck/layers/slide-top' });
    expect(src).toContain("import slideTop from './roots/deck/layers/slide-top';");
    expect(src).toContain("'slide-top': slideTop,");
  });
});
