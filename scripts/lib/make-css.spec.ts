import { describe, expect, it } from 'vitest';
import { createGenerator } from '@unocss/core';
import config from '../../uno.config.mjs';
import { boundClasses } from './make-css.mjs';

const css = async (classes: string) =>
  (await (await createGenerator(config)).generate(classes)).css;

describe('uno.config shortcuts', () => {
  it('has the corner shortcuts of Slidev', async () => {
    expect(await css('abs-br')).toMatch(/bottom:0;?[\s\S]*right:0|right:0;?[\s\S]*bottom:0/);
    expect(await css('abs-tl abs-tr abs-bl abs-b')).toContain('position:absolute');
  });
  it('has bg-primary and the z-index names', async () => {
    expect(await css('bg-primary')).toContain('--slidev-theme-primary');
    expect(await css('z-drawing z-camera z-dragging z-label z-focus-indicator')).toContain(
      'z-index:200',
    );
  });
});

describe('boundClasses', () => {
  it('finds the classes of [class.x] bindings', async () => {
    const text = `<div [class.rotate-45]="on"></div> host: { '[class.justify-end]': 'right()' }`;
    expect(boundClasses(text)).toBe('rotate-45 justify-end');
    expect(await css(`${text}\n${boundClasses(text)}`)).toContain('rotate:45deg');
  });
});
