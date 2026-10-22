import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { angularOutput, overlayError, withSlideSources } from './runtime.mjs';

describe('withSlideSources', () => {
  it("adds the markdown file and line to Angular's errors about a generated slide", () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated'), { recursive: true });
    writeFileSync(
      join(app, 'src/slides/generated/slide-003.ts'),
      '// GENERATED from slides.md:41 (slide 3) - do not edit\n',
    );
    expect(withSlideSources('ERROR src/slides/generated/slide-003.ts:11:110 - NG5002', app)).toBe(
      'ERROR src/slides/generated/slide-003.ts:11:110 (slide 3, slides.md:41) - NG5002',
    );
    expect(withSlideSources('src/slides/generated/slide-009.ts:1:1', app)).toBe(
      'src/slides/generated/slide-009.ts:1:1',
    );
  });
  it('names the line of the markdown the error comes from, and adds the place once', () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated'), { recursive: true });
    const md = join(app, 'slides.md');
    writeFileSync(
      md,
      '---\ntitle: t\n---\n\n# One\n\n---\nlayout: center\n---\n\n<flag-badgee a="1" />\n\n<flag-badgee b="2" />\n',
    );
    const template = JSON.stringify(
      '<sn-center><flag-badgee a="1" /><flag-badgee b="2" /></sn-center>',
    );
    writeFileSync(
      join(app, 'src/slides/generated/slide-002.ts'),
      `// GENERATED from slides.md:7 (slide 2) - do not edit\n// LINES ${JSON.stringify({ file: md, from: 6, to: 14 })}\nimport x;\n  template: ${template},\n`,
    );
    const line4 = `  template: ${template},`;
    const at = (html: string) => line4.indexOf(JSON.stringify(html).slice(1, -1));
    expect(
      withSlideSources(`src/slides/generated/slide-002.ts:4:${at('<flag-badgee b')}:`, app),
    ).toBe(`src/slides/generated/slide-002.ts:4:${at('<flag-badgee b')} (slide 2, slides.md:13):`);
    expect(
      withSlideSources(`src/slides/generated/slide-002.ts:4:${at('<flag-badgee a')}`, app),
    ).toBe(`src/slides/generated/slide-002.ts:4:${at('<flag-badgee a')} (slide 2, slides.md:11)`);
    // Outside the template (or text the markdown does not have): the slide's --- line.
    expect(withSlideSources('src/slides/generated/slide-002.ts:3:1', app)).toBe(
      'src/slides/generated/slide-002.ts:3:1 (slide 2, slides.md:7)',
    );
    // Text that names the place already is left alone (the page's overlay gets it from the terminal's text).
    const named = 'src/slides/generated/slide-002.ts:3:1 (slide 2, slides.md:7)';
    expect(withSlideSources(named, app)).toBe(named);
  });
  it("names the author's own file for an error in a copied theme or deck file", () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated'), { recursive: true });
    writeFileSync(
      join(app, 'src/slides/generated/roots.json'),
      JSON.stringify({ deck: '/talk', 'theme-t': '/themes/t' }),
    );
    expect(
      withSlideSources(
        `ERROR ${app}/src/slides/generated/roots/deck/components/signup.ts:73:2 - TS2339`,
        app,
      ),
    ).toBe('ERROR /talk/components/signup.ts:73:2 - TS2339');
    expect(withSlideSources('src/slides/generated/roots/theme-t/layouts/split.ts:5:37', app)).toBe(
      '/themes/t/layouts/split.ts:5:37',
    );
  });
  it('names the nearest known element for a typo, and customElements for any other unknown tag', () => {
    const app = mkdtempSync(join(tmpdir(), 'slide-ng-runtime-'));
    mkdirSync(join(app, 'src/slides/generated/roots/deck/components'), { recursive: true });
    writeFileSync(
      join(app, 'src/slides/generated/roots/deck/components/counter.ts'),
      "@Component({ selector: 'my-counter', template: '' })\nexport class Counter {}\n",
    );
    const error = (tag: string) =>
      withSlideSources(`NG8001: '${tag}' is not a known element:`, app);
    expect(error('my-countr')).toBe(
      "NG8001: 'my-countr' is not a known element: (did you mean <my-counter>?)",
    );
    expect(error('slide-ng-tocc')).toContain('(did you mean <slide-ng-toc>?)');
    expect(error('model-viewer')).toContain('customElements: [model-viewer]');
    // In a slide (components/ deleted, say) the hint starts with the deck's components, not with a layout's imports.
    expect(error('risk-meter')).toContain(
      "(a component of the deck: is its file in components/, with selector 'risk-meter'?",
    );
  });
});

describe('overlayError', () => {
  it("splits the terminal's error block into the overlay's message and file line", () => {
    const block = [
      "✘ [ERROR] NG8001: 'flag-badgee' is not a known element: (did you mean <flag-badge>?)",
      "1. If 'flag-badgee' is an Angular component, then ... Find more at https://next.angular.dev/errors/NG8001 [plugin angular-compiler]",
      '',
      '    /d/.slide-ng/app/src/slides/generated/slide-005.ts:11:450 (slide 5, slides.md:68):',
      '      11 │ ...</table>\\n<flag-badgee name=\\"checkout-v2\\" /></sn...',
      '         ╵              ~~~~~~~~~~~~~~~~~~~~~',
    ].join('\n');
    expect(overlayError(block)).toEqual({
      message:
        "NG8001: 'flag-badgee' is not a known element: (did you mean <flag-badge>?)\n1. If 'flag-badgee' is an Angular component, then ... Find more at https://next.angular.dev/errors/NG8001",
      file: '/d/.slide-ng/app/src/slides/generated/slide-005.ts:11:450 (slide 5, slides.md:68)',
    });
    expect(overlayError('✘ [ERROR] Could not resolve "x"')).toEqual({
      message: 'Could not resolve "x"',
      file: '',
    });
  });
});

describe('angularOutput', () => {
  const unknown = [
    "\x1b[31m✘ [ERROR] NG8001: 'risk-metr' is not a known element: (did you mean <risk-meter>?)",
    "1. If 'risk-metr' is an Angular component, then verify ...",
    '',
    '    src/slides/generated/slide-005.ts:12:1192 (slide 5, slides.md:62):',
    '',
  ];
  const followOn = [
    "✘ [ERROR] NG8002: Can't bind to 'level' since it isn't a known property of 'risk-metr'.",
    "1. If 'risk-metr' is an Angular component and it has 'level' input, ...",
    '',
    '    src/slides/generated/slide-005.ts:12:1218 (slide 5, slides.md:62):',
  ];
  const tidy = (lines: string[], now = () => 0) => {
    const out: string[] = [];
    const t = angularOutput((line: string) => out.push(line), { now, idleMs: -1 });
    for (const line of lines) t.line(line, null);
    t.flush();
    return out;
  };
  it("leaves out NG8002 for an element NG8001 already reports, and keeps other NG8002's", () => {
    const out = tidy(['Application bundle generation failed.', ...unknown, ...followOn]);
    expect(out.join('\n')).toContain('NG8001');
    expect(out.join('\n')).not.toContain('NG8002');
    expect(tidy(followOn).join('\n')).toContain('NG8002');
  });
  it('says so in one line when a rebuild fails with the same errors as the one just before', () => {
    let time = 0;
    const cycle = [
      '❯ Changes detected. Rebuilding...',
      'Application bundle generation failed.',
      ...unknown,
    ];
    const out = tidy([...cycle, ...cycle], () => time);
    expect(out.filter((l) => l.includes('NG8001'))).toHaveLength(1);
    expect(out.at(-1)).toBe(
      '[slide.ng] the same error as in the rebuild just before (not printed again)',
    );
    // Later, or after a good build, the error is printed again.
    const again = tidy([...cycle, 'Application bundle generation complete.', ...cycle]);
    expect(again.filter((l) => l.includes('NG8001'))).toHaveLength(2);
    time = 0;
    const lines: string[] = [];
    const t = angularOutput((l: string) => lines.push(l), { now: () => time, idleMs: -1 });
    for (const l of cycle) t.line(l, null);
    t.flush(); // the idle timer prints a block that nothing follows
    time = 60_000;
    for (const l of cycle) t.line(l, null);
    t.flush();
    expect(lines.filter((l) => l.includes('NG8001'))).toHaveLength(2);
  });
});
