import { inflateRawSync } from 'node:zlib';
import { initHighlighter } from './highlighter.mjs';
import { isMagicMove, renderMagicMove } from './magic-move.mjs';
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
});
