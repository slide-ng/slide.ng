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
});
