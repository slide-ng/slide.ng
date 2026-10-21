import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { presetProblems } from './click-presets.mjs';

describe('presetProblems', () => {
  it('warns about a near miss of a built-in preset, with the name', () => {
    expect(presetProblems({ markup: '<div click-anim="fadee" slide-ng-click>' })).toEqual([
      'the click animation preset "fadee" is not built in and no styles define .slidev-vclick-anim-fadee, so it has no animation. Did you mean "fade"?',
    ]);
    expect(presetProblems({ markup: '<slide-ng-clicks animation="fade upp">' })[0]).toContain(
      'Did you mean "up"?',
    );
    expect(presetProblems({ markup: '', frontmatter: { clickAnimation: 'scael' } })[0]).toContain(
      'Did you mean "scale"?',
    );
  });
  it('says nothing for built-in presets, unrelated names, or presets the styles define', () => {
    expect(
      presetProblems({
        markup: '<p click-anim="fade.right">',
        headmatter: { clickAnimation: 'up' },
      }),
    ).toEqual([]);
    expect(presetProblems({ markup: '<p click-anim="pop">' })).toEqual([]);
    expect(
      presetProblems({
        markup: '<p click-anim="upp">',
        css: '.slidev-vclick-anim-upp { opacity: 0 }',
      }),
    ).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), 'slide-ng-presets-'));
    mkdirSync(join(dir, 'styles'));
    writeFileSync(
      join(dir, 'styles/index.css'),
      '.slidev-vclick-anim-lefty.slidev-vclick-hidden {}',
    );
    expect(presetProblems({ markup: '<p click-anim="lefty">', roots: [{ dir }] })).toEqual([]);
  });
  it('warns once per name in one generation', () => {
    const roots = [{}];
    const once = { markup: '', headmatter: { clickAnimation: 'fadee' }, roots };
    expect(presetProblems(once)).toHaveLength(1);
    expect(presetProblems(once)).toHaveLength(0);
  });
});
