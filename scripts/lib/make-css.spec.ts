import { describe, expect, it } from 'vitest';
import { createGenerator } from '@unocss/core';
import config from '../../uno.config.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  attributifyOn,
  boundClasses,
  componentInputs,
  makeCss,
  withoutForeignAttributes,
} from './make-css.mjs';

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

describe('withoutForeignAttributes', () => {
  it('hides the inputs of slide.ng components from attributify', async () => {
    const text = `<slide-ng-mermaid scale="0.8" packed="x" /> <slide-ng-toc columns="2" class="text-blue-500" />`;
    const out = await css(withoutForeignAttributes(text));
    expect(out).not.toContain('[scale~=');
    expect(out).not.toContain('[columns~=');
    expect(withoutForeignAttributes(text)).toBe('<slide-ng-mermaid /> <slide-ng-toc />');
    // A generated slide writes the line breaks of its template as `\n`.
    expect(withoutForeignAttributes('<slide-ng-toc\\n  columns="2"\\n  />')).toBe(
      '<slide-ng-toc\\n  />',
    );
  });
  it('hides the props of the layout element of a slide', async () => {
    const text = `<sn-iframe-right url="data:text/html,x" scale="0.8" contentClass="p-4"><div p="2"></div></sn-iframe-right>`;
    const out = await css(withoutForeignAttributes(text));
    expect(out).not.toContain('[scale~=');
    expect(withoutForeignAttributes(text)).toBe(
      '<sn-iframe-right><div p="2"></div></sn-iframe-right>',
    );
  });
  it('hides the attributes inside an inline SVG', async () => {
    const text = `<svg width="200"><text x="10" font-size="14" fill="red">Hi</text></svg>`;
    expect(withoutForeignAttributes(text)).toBe('<svg><text>Hi</text></svg>');
    expect(await css(withoutForeignAttributes(text))).not.toContain('[font-size~=');
    // A self-closing <svg /> ends there, and <svg-icon> is not an SVG.
    const after = '<svg class="a" /> <div p="4"></div> <svg-icon m="2"></svg-icon> </svg>';
    expect(withoutForeignAttributes(after)).toBe(
      '<svg /> <div p="4"></div> <svg-icon m="2"></svg-icon> </svg>',
    );
  });
  it('hides the attributes of SVG elements written outside an <svg>, as in a renderer that builds strings', async () => {
    const text =
      'const label = `<text x="1" font-size="14" fill="currentColor">${t}</text><g\\n stroke-width="2">`;';
    expect(withoutForeignAttributes(text)).toBe('const label = `<text>${t}</text><g>`;');
    const out = await css(withoutForeignAttributes(text));
    expect(out).not.toContain('[font-size~=');
    expect(out).not.toContain('[stroke-width~=');
    // <textarea> and <link> are not SVG elements.
    expect(withoutForeignAttributes('<textarea p="2"></textarea><link m="1">')).toBe(
      '<textarea p="2"></textarea><link m="1">',
    );
  });
  it("hides the inputs of the deck's own components, not their other attributes", async () => {
    const inputs = componentInputs([
      `@Component({ selector: 'stat-row', template: '' })
      export class StatRow { label = input(''); grid = input(false, { transform: booleanAttribute }); @Input() flat = false; }`,
      `export const notAComponent = input('');`,
    ]);
    expect([...inputs]).toEqual([['stat-row', new Set(['label', 'grid', 'flat'])]]);
    const text =
      '<stat-row id="r1" label="Revenue" grid p="4" /> <div grid></div> <stat-rows grid>';
    expect(withoutForeignAttributes(text, inputs)).toBe(
      '<stat-row id="r1" p="4" /> <div grid></div> <stat-rows grid>',
    );
  });
  it('keeps attributify on plain HTML elements', async () => {
    const text = `<div flex="~ col" text="red-500">x</div> <slide-ng-arrow x1="1" /> <p p="4">y</p>`;
    expect(withoutForeignAttributes(text)).toBe(
      '<div flex="~ col" text="red-500">x</div> <slide-ng-arrow /> <p p="4">y</p>',
    );
    const out = await css(withoutForeignAttributes(text));
    expect(out).toContain('[flex~="col"]');
    expect(out).toContain('[p~="\\34 "]');
  });
});

describe('unocss: { attributify: false }', () => {
  it('reads plain attributes as utilities unless the headmatter turns attributify off', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'uno-')), 'slides.md');
    writeFileSync(file, '<table border="1" class="p-2"><tr><td m="4">x</td></tr></table>');
    const on = await makeCss([file]);
    expect(on).toContain('[border~="\\31 "]');
    const off = await makeCss([file], [], [], {
      attributify: attributifyOn({ unocss: { attributify: false } }),
    });
    expect(off).not.toContain('[border');
    expect(off).not.toContain('[m~=');
    expect(off).toContain('.p-2');
    expect(attributifyOn({})).toBe(true);
  });
});
