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
      const start = html.indexOf('id="run">') + 9;
      const code = html.slice(start, html.indexOf('</script>', start));
      const sent: { error?: string; done?: boolean }[] = [];
      new Function('send', code)((m: { error?: string }) => sent.push(m));
      await new Promise((r) => setTimeout(r, 0));
      return sent.find((m) => 'error' in m)?.error;
    };
    expect(await run(true)).toMatch(
      /^ReferenceError: total is not defined \(.*monacoRunUseStrict: false/,
    );
    expect(await run(false)).toBeUndefined();
    delete (globalThis as { total?: number }).total;
  });
  it('runs the code in a worker, and in the frame where no worker can start', () => {
    const html = frameHtml('console.log(1)', 'run-1');
    expect(html).toContain('<script type="text/x-slide-ng-run" id="run">');
    expect(html).toContain('new Worker(url)');
    expect(html).toContain('if (!started) return inFrame();');
  });
});
