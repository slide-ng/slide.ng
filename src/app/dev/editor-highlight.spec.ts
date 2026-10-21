import { createEditorHighlighter } from './editor-highlight';

describe('createEditorHighlighter', () => {
  it('colours markdown with both themes as variables', async () => {
    const html = (await createEditorHighlighter())('# Title\n\nsome **bold** text');
    expect(html).toContain('class="shiki');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    expect(html).toContain('Title');
  });
  it('escapes html in the text', async () => {
    const html = (await createEditorHighlighter())('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&#x3C;');
  });
  it('keeps every line, also a last empty one', async () => {
    const html = (await createEditorHighlighter())('a\n\nb\n');
    expect((html.match(/class="line"/g) ?? []).length).toBe(4);
  });
  it('is no Tab stop and is not read out', async () => {
    const html = (await createEditorHighlighter())('# Title');
    expect(html).toMatch(/^<pre [^>]*tabindex="-1"/);
    expect(html).toMatch(/^<pre [^>]*aria-hidden="true"/);
  });
});
