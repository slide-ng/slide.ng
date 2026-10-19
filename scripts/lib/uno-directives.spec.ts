import { createGenerator } from '@unocss/core';
import { describe, expect, it, vi } from 'vitest';
import config from '../../uno.config.mjs';
import {
  applyDirectives,
  expandGroups,
  slideStyleDirectives,
  unknownUtilities,
} from './uno-directives.mjs';

const uno = () => createGenerator(config);

describe('expandGroups', () => {
  it('expands variant groups in class and attributify values', () => {
    expect(expandGroups('<div class="p-2 hover:(bg-red-500 text-white)">')).toBe(
      '<div class="p-2 hover:bg-red-500 hover:text-white">',
    );
    expect(expandGroups('<p text="sm:(xl red-500)">')).toBe('<p text="sm:xl sm:red-500">');
  });

  it('leaves text attributes and bindings alone', () => {
    const html = '<a title="Note:(one)" href="x:(y)" [class]="a ? \'b:(c)\' : \'\'">';
    expect(expandGroups(html)).toBe(html);
  });
});

describe('applyDirectives', () => {
  it('writes out @apply and --uno: with the deck config', async () => {
    const css = await applyDirectives(
      '.a { @apply p-4 font-bold; }\n.b { --uno: text-center; }',
      await uno(),
    );
    expect(css).toMatch(/\.a\s*\{\s*padding:1rem;\s*font-weight:700;\s*\}/);
    expect(css).toContain('text-align:center');
    expect(css).not.toMatch(/@apply|--uno/);
  });

  it('turns @screen and theme() into CSS', async () => {
    const css = await applyDirectives(
      '@screen md { .c { color: theme("colors.red.500"); } }',
      await uno(),
    );
    expect(css).toContain('@media (min-width: 768px)');
    expect(css).not.toContain('theme(');
  });

  it('leaves CSS without directives as it is', async () => {
    expect(await applyDirectives('.a { color: red }', await uno())).toBe('.a { color: red }');
  });
});

describe('unknownUtilities', () => {
  it('names the utilities UnoCSS does not know, not words in comments', async () => {
    const css = '/* uses @apply; */ .a { @apply p-4 nope-xyz; } .b { --uno: "m-2 also-nope"; }';
    expect(await unknownUtilities(css, await uno())).toEqual(['nope-xyz', 'also-nope']);
  });
  it('reads a variant group as its utilities, as the transformer does', async () => {
    const css = '.a { @apply hover:(bg-red-500 text-white) p-2; }';
    expect(await unknownUtilities(css, await uno())).toEqual([]);
  });
});

describe('slideStyleDirectives', () => {
  it("maps each slide's <style> text to the written-out CSS and warns about unknown utilities", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const slides = [
      { content: '# A\n\n<style>\nh1 { @apply text-red-500; }\n</style>' },
      { content: '# B\n\n<style>\nh1 { color: blue }\n</style>' },
      { content: '# C\n\n<style>\nh1 { @apply not-a-utility-xyz; }\n</style>' },
    ];
    const done = await slideStyleDirectives(slides, await uno());
    expect([...done.keys()]).toEqual([
      'h1 { @apply text-red-500; }',
      'h1 { @apply not-a-utility-xyz; }',
    ]);
    expect(done.get('h1 { @apply text-red-500; }')).toContain('color:rgb(239 68 68');
    expect(warn.mock.calls.join()).toMatch(/slide 3: <style>: unknown utilities not-a-utility-xyz/);
    warn.mockRestore();
  });
});
