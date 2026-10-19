import { noteToHtml } from './note-html.mjs';

describe('noteToHtml', () => {
  it('has nothing for an empty note', () => {
    expect(noteToHtml(undefined)).toBeNull();
    expect(noteToHtml('  \n')).toBeNull();
  });

  it('renders markdown', () => {
    expect(noteToHtml('This is a **note**')).toContain('<strong>note</strong>');
  });

  it('opens web pages in a new tab and leaves other links as written', () => {
    expect(noteToHtml('[docs](https://x.org) [three](3)')).toBe(
      '<p><a href="https://x.org" target="_blank" rel="noopener">docs</a> <a href="3">three</a></p>\n',
    );
  });

  it('turns [click] into numbered markers', () => {
    const html = noteToHtml('Before\n[click] one\n[click] two')!;
    expect(html).toContain('data-clicks="1"');
    expect(html).toContain('data-clicks="2"');
    expect(html).not.toContain('[click]');
  });

  it('[click:3] skips two clicks', () => {
    const html = noteToHtml('[click] a\n[click:3] b')!;
    expect(html).toContain('data-clicks="1"');
    expect(html).toContain('data-clicks="4"');
  });

  it('markers inside list items stay in the list', () => {
    const html = noteToHtml('- [click] first\n- [click] second')!;
    expect(html).toMatch(
      /<li><span class="slidev-note-click-mark" data-clicks="1"><\/span> first<\/li>/,
    );
  });
});
