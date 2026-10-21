import { describe, expect, it } from 'vitest';
import { frameHtml } from './runner-frame';

describe('frameHtml', () => {
  it('runs the code in strict mode by default (monacoRunUseStrict, as in Slidev)', () => {
    expect(frameHtml('x = 1', 'run-1')).toContain(
      `'return (async () => {' + '"use strict";' + "x = 1"`,
    );
  });
  it('leaves strict mode out when asked', () => {
    const html = frameHtml('x = 1', 'run-1', false);
    expect(html).not.toContain('use strict');
    expect(html).toContain(`'return (async () => {' + "x = 1"`);
  });
  it('names monacoRunUseStrict when strict mode refuses an undeclared name', async () => {
    const run = async (strict: boolean) => {
      const html = frameHtml('total = 1;', 'run-1', strict);
      const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
      const sent: { error?: string; done?: boolean }[] = [];
      const parent = { postMessage: (m: { error?: string }) => sent.push(m) };
      new Function('parent', script)(parent);
      await new Promise((r) => setTimeout(r, 0));
      return sent.find((m) => 'error' in m)?.error;
    };
    expect(await run(true)).toMatch(
      /^ReferenceError: total is not defined \(.*monacoRunUseStrict: false/,
    );
    expect(await run(false)).toBeUndefined();
    delete (globalThis as { total?: number }).total;
  });
});
