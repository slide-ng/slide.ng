import { markAlerts } from './alerts.mjs';
import { extractFootnotes, finishFootnotes } from './footnotes.mjs';
import { rewriteIcons } from './icons.mjs';
import { toTemplate } from './to-template.mjs';

describe('markAlerts', () => {
  it('turns a [!NOTE] blockquote into an alert with a title', () => {
    const html = markAlerts(
      '<blockquote>\n<p>[!NOTE]\nHello <strong>b</strong></p>\n</blockquote>',
    );
    expect(html).toBe(
      '<div class="markdown-alert markdown-alert-note"><p class="markdown-alert-title"><span class="i-carbon:information"></span>Note</p><p>Hello <strong>b</strong></p>\n</div>',
    );
  });
  it('knows all five kinds, in any letter case', () => {
    for (const k of ['TIP', 'important', 'Warning', 'CAUTION']) {
      expect(markAlerts(`<blockquote>\n<p>[!${k}]</p>\n<p>x</p>\n</blockquote>`)).toContain(
        `markdown-alert-${k.toLowerCase()}`,
      );
    }
  });
  it('drops the empty paragraph when the marker is alone on its line', () => {
    expect(markAlerts('<blockquote>\n<p>[!TIP]</p>\n<p>x</p>\n</blockquote>')).not.toContain(
      '<p></p>',
    );
  });
  it('closes at the right </blockquote> when quotes are nested', () => {
    const html = markAlerts(
      '<blockquote>\n<p>[!WARNING]</p>\n<blockquote>\n<p>inner</p>\n</blockquote>\n</blockquote>\n<p>after</p>',
    );
    expect(html).toContain('<blockquote>\n<p>inner</p>\n</blockquote>\n</div>\n<p>after</p>');
  });
  it('leaves a normal blockquote and an unknown marker alone', () => {
    const plain = '<blockquote>\n<p>[!NOPE]\nx</p>\n</blockquote>';
    expect(markAlerts(plain)).toBe(plain);
  });
});

describe('footnotes', () => {
  it('numbers notes by first use and removes the definitions', () => {
    const { markdown, notes } = extractFootnotes(
      'A[^b] and B[^a] and A again[^b].\n\n[^a]: Note a\n[^b]: Note b\n  continued',
    );
    expect(markdown).toContain('ANGFOOT1X and BNGFOOT2X and A againNGFOOT1X.');
    expect(markdown).not.toContain('Note');
    expect(notes).toEqual(['Note b continued', 'Note a']);
  });
  it('leaves a reference without a definition as written', () => {
    expect(extractFootnotes('x[^missing]').markdown).toBe('x[^missing]');
  });
  it('writes superscript numbers and the list', () => {
    const html = finishFootnotes('<p>aNGFOOT1X</p>', ['n'], (s) => s);
    expect(html).toBe(
      '<p>a<sup class="footnote-ref">[1]</sup></p>\n<hr class="footnotes-sep" /><section class="footnotes"><ol class="footnotes-list"><li class="footnote-item">n</li></ol></section>',
    );
  });
  it('adds nothing when there are no notes', () => {
    expect(finishFootnotes('<p>a</p>', [], (s) => s)).toBe('<p>a</p>');
  });
});

describe('rewriteIcons', () => {
  const sets = ['carbon', 'mdi', 'ph', 'simple-icons'];
  it('rewrites a self-closing icon tag', () => {
    expect(rewriteIcons('a <carbon-apps /> b', sets)).toBe(
      'a <span class="i-carbon:apps"></span> b',
    );
    expect(rewriteIcons('<mdi-account-circle/>', sets)).toBe(
      '<span class="i-mdi:account-circle"></span>',
    );
  });
  it('keeps an icon with class inline visible (inline-block)', () => {
    expect(rewriteIcons('<carbon-arrow-right class="inline ml-1" />', sets)).toBe(
      '<span class="i-carbon:arrow-right inline-block ml-1"></span>',
    );
  });
  it('adds to an existing class and keeps other attributes', () => {
    expect(rewriteIcons('<ph-star-fill class="text-red" style="color: blue" />', sets)).toBe(
      '<span class="i-ph:star-fill text-red" style="color: blue"></span>',
    );
    expect(rewriteIcons('<carbon-apps title="x" />', sets)).toBe(
      '<span class="i-carbon:apps" title="x"></span>',
    );
  });
  it('rewrites open and close tags as a pair', () => {
    expect(rewriteIcons('<carbon-apps></carbon-apps>', sets)).toBe(
      '<span class="i-carbon:apps"></span>',
    );
  });
  it('picks the longest set name', () => {
    expect(rewriteIcons('<simple-icons-github />', sets)).toBe(
      '<span class="i-simple-icons:github"></span>',
    );
  });
  it('leaves tags of sets that are not installed, and normal custom tags', () => {
    expect(rewriteIcons('<fa-user /> <app-counter /> <carbon />', sets)).toBe(
      '<fa-user /> <app-counter /> <carbon />',
    );
  });
});

describe('markdown extras in a slide', () => {
  it('renders an alert, a task list, a footnote and an icon together', () => {
    const html = toTemplate(
      '> [!TIP]\n> Use it\n\n- [x] done\n- [ ] todo\n\nText[^1] <carbon-apps />\n\n[^1]: Because {{ x }}',
      {},
    );
    expect(html).toContain('markdown-alert-tip');
    expect(html).toContain('<input checked="" disabled="" type="checkbox">');
    expect(html).toContain('<sup class="footnote-ref">[1]</sup>');
    expect(html).toContain('<span class="i-carbon:apps"></span>');
    expect(html).toContain('<li class="footnote-item">Because &#123;&#123; x &#125;&#125;</li>'); // braces are protected
  });
});
