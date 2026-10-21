import { inflateRawSync } from 'node:zlib';
import { initHighlighter } from './highlighter.mjs';
import { isMagicMove, magicMoveOptions, renderMagicMove } from './magic-move.mjs';
import { extractFences } from '../fences.mjs';

beforeAll(() => initHighlighter({ langs: ['js', 'ts'] }));

const source =
  '````md magic-move [a.js] {duration:300}\n```js {*|1}\nlet a = 1\n```\n\nsome text between\n\n```ts {lines:true}\nlet a: number = 1\nlet b = 2\n```\n````';
const fence = () => (extractFences(source) as { fences: any[] }).fences[0];

describe('magic move', () => {
  it('is only a four backtick fence with `md magic-move`', () => {
    expect(isMagicMove(fence())).toBe(true);
    expect(isMagicMove({ ticks: 3, info: 'md magic-move' })).toBe(false);
    expect(isMagicMove({ ticks: 4, info: 'ts' })).toBe(false);
  });
  it('writes the component with title, duration, step ranges and packed steps', () => {
    const html = renderMagicMove(fence());
    expect(html).toContain('<slide-ng-magic-move title="a.js" duration="300" steps="');
    expect(html).toContain('stepRanges="[[&quot;*&quot;,&quot;1&quot;],[]]"');
    expect(html).not.toContain('{');
  });
  it('passes a ~icon~ of the title as the icon', () => {
    const src = '````md magic-move [a.js ~i-carbon:code~]\n```js\nlet a = 1\n```\n````';
    const html = renderMagicMove((extractFences(src) as { fences: any[] }).fences[0]);
    expect(html).toContain('title="a.js" icon="i-carbon:code"');
  });
  it('packs one step per code block, with keyed tokens', () => {
    const packed = /steps="([^"]+)"/.exec(renderMagicMove(fence()))![1];
    const steps = JSON.parse(inflateRawSync(Buffer.from(packed, 'base64')).toString());
    expect(steps).toHaveLength(2);
    expect(steps[0].code).toBe('let a = 1');
    expect(steps[1].lineNumbers).toBe(true);
    expect(steps[1].tokens.every((t: { key: string }) => t.key)).toBe(true);
  });

  it('passes the headmatter shiki.magicMove options to the component', () => {
    const shiki = { magicMove: { stagger: 5, easing: 'linear', splitTokens: true, duration: 999 } };
    const html = renderMagicMove(fence(), { headmatter: { shiki } });
    const text = /options="([^"]+)"/.exec(html)![1];
    const options = text
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
    expect(JSON.parse(options)).toEqual({
      stagger: 5,
      easing: 'linear',
      splitTokens: true,
    });
  });
  it('the block duration wins, then magicMoveDuration, then shiki.magicMove.duration', () => {
    const shiki = { magicMove: { duration: 999 } };
    const plain = (
      extractFences('````md magic-move\n```js\nlet a = 1\n```\n````') as { fences: any[] }
    ).fences[0];
    expect(renderMagicMove(fence(), { headmatter: { shiki, magicMoveDuration: 500 } })).toContain(
      'duration="300"',
    );
    expect(renderMagicMove(plain, { headmatter: { shiki, magicMoveDuration: 500 } })).toContain(
      'duration="500"',
    );
    expect(renderMagicMove(plain, { headmatter: { shiki } })).toContain('duration="999"');
    expect(renderMagicMove(plain, { headmatter: { shiki } })).not.toContain('options=');
  });
});

describe('magicMoveOptions', () => {
  it('keeps every Slidev option of the right type', () => {
    const all = {
      duration: 1,
      stagger: 2,
      delayMove: 0.1,
      delayLeave: 0.2,
      delayEnter: 0.3,
      delayContainer: 0.4,
      easing: 'ease-in',
      animateContainer: true,
      containerStyle: false,
      splitTokens: true,
      enhanceMatching: true,
    };
    expect(magicMoveOptions(all)).toEqual(all);
  });
  it('drops unknown keys and wrong types with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(magicMoveOptions({ stagger: '5', colour: 'red', easing: 'linear' })).toEqual({
      easing: 'linear',
    });
    expect(warn).toHaveBeenCalledTimes(2);
    expect(magicMoveOptions('fast')).toEqual({});
    expect(magicMoveOptions(undefined)).toEqual({});
    warn.mockRestore();
  });
});
