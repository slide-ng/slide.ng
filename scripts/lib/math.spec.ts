import { extractMath, mathRows, renderMath, titleHtml } from './math.mjs';
import { hasMath } from './features.mjs';

const found = (md: string) => extractMath(md) as { markdown: string; maths: any[] };

describe('extractMath', () => {
  it('finds inline math and leaves a word behind', () => {
    const r = found('so $x^2 + y_1$ here');
    expect(r.markdown).toBe('so NGMATH0X here');
    expect(r.maths).toEqual([{ block: false, latex: 'x^2 + y_1' }]);
  });
  it('leaves $ in Angular bindings, interpolations and control flow alone', () => {
    const md =
      '@for (x of xs; track x; let l = $last) {\n<div [class.b]="$first" [class.i]="$last">{{ \'$\' + x }}</div>\n}';
    expect(found(md)).toEqual({ markdown: md, maths: [] });
    expect(found('<b [title]="$first">x</b> and $y^2$').maths).toEqual([
      { block: false, latex: 'y^2' },
    ]);
  });
  it('keeps {{ inside inline math as math', () => {
    expect(found('So ${{a}} + b$ here').maths).toEqual([{ block: false, latex: '{{a}} + b' }]);
  });
  it('does not treat prices as math', () => {
    expect(found('it costs $5 and $10 today').maths).toHaveLength(0);
  });
  it('ignores an escaped dollar', () => {
    expect(found('a \\$b and c\\$ d').maths).toHaveLength(0);
  });
  it('finds a block over several lines, with ranges and options', () => {
    const r = found('$$ {1|3|all} {at:2}\n\\begin{aligned}\na\n\\end{aligned}\n$$');
    expect(r.maths).toHaveLength(1);
    expect(r.maths[0]).toMatchObject({ block: true, ranges: '1|3|all', options: '{at:2}' });
    expect(r.maths[0].latex).toBe('\\begin{aligned}\na\n\\end{aligned}');
  });
  it('finds a one line block', () => {
    expect(found('$$ a^2 $$').maths[0]).toMatchObject({ block: true, latex: 'a^2' });
  });
});

describe('renderMath', () => {
  it('draws with KaTeX and protects the output from Angular', () => {
    const html = renderMath({ block: false, latex: '\\frac{a}{b} \\{x\\}' });
    expect(html.startsWith('<span ngNonBindable>')).toBe(true);
    expect(html).toContain('class="katex"');
    expect(html).not.toMatch(/[{}@]/);
    expect(html).not.toContain('<math');
  });
  it('keeps {{ in a formula as text', () => {
    expect(renderMath({ block: false, latex: 'a^{{b}}' })).not.toContain('{{');
  });
  it('wraps a block in slide-ng-katex-block-wrapper with its ranges', () => {
    const html = renderMath({ block: true, latex: 'a', ranges: '1|all' });
    expect(html).toContain('<slide-ng-katex-block-wrapper ranges="1|all"><div ngNonBindable>');
    expect(html).toContain('katex-display');
  });
  it('shows the source when KaTeX cannot draw it, without throwing', () => {
    expect(() => renderMath({ block: false, latex: '\\notacommand{' })).not.toThrow();
  });
});

describe('hasMath (feature detection)', () => {
  it('is true for math, false for dollars in code and prices', () => {
    expect(hasMath('text $a+b$ text')).toBe(true);
    expect(hasMath('```sh\necho $HOME and $PATH\n```')).toBe(false);
    expect(hasMath('use `$x$` here')).toBe(false);
    expect(hasMath('costs $5 or $6')).toBe(false);
  });
});

describe('titleHtml', () => {
  it('renders inline markdown of a title, draws its math and gives null without a title', () => {
    const html = titleHtml('A **bold** title $x^2$')!;
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('class="katex"');
    expect(titleHtml('Plain title, $5 and $10')).toBe('Plain title, $5 and $10');
    expect(titleHtml(null)).toBeNull();
  });
  it('shows raw HTML in a title as text', () => {
    const html = titleHtml('A <img src=x onerror=alert(1)> and <b>tag</b>')!;
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
  it('pairs markdown delimiters that wrap a formula', () => {
    const html = titleHtml('**Area $\\pi r^2$ formula**')!;
    expect(html).toContain('<strong>');
    expect(html).toContain('</strong>');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('**');
  });
});

describe('math row steps', () => {
  const aligned = '\\begin{aligned}\na &= 1 \\\\\nb &= 2\n\\end{aligned}';
  it('counts the rows of the environment', () => {
    expect(mathRows(aligned)).toBe(2);
    expect(mathRows('a = 1')).toBe(0);
  });
  it('warns about a step outside the rows, as for code', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderMath({ block: true, latex: aligned, ranges: '1|2|all' }, () => 'slide 4: ');
    expect(warn).not.toHaveBeenCalled();
    renderMath({ block: true, latex: aligned, ranges: '1|5' }, () => 'slide 4: ');
    expect(warn).toHaveBeenCalledWith(
      '[slides] slide 4: math: the row range {5} is outside the rows shown (1-2), so it highlights no row; ranges use the numbers shown',
    );
    warn.mockRestore();
  });
});
