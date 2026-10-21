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

  describe('notesAutoRuby', () => {
    it('wraps a listed word in <ruby><rt>…</rt></ruby>', () => {
      const html = noteToHtml('read the 漢字 here', { 漢字: 'かんじ' })!;
      expect(html).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
    });

    it('leaves text unchanged when the map is empty, missing or not an object', () => {
      const plain = noteToHtml('read the 漢字 here')!;
      expect(noteToHtml('read the 漢字 here', {})).toBe(plain);
      expect(noteToHtml('read the 漢字 here', null)).toBe(plain);
    });

    it('applies the longest word first, so shorter words do not steal its characters', () => {
      const html = noteToHtml('漢字 and 字 side by side', { 字: 'じ', 漢字: 'かんじ' })!;
      expect(html).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
      expect(html).toContain('<ruby>字<rt>じ</rt></ruby>');
      expect(html).not.toContain('漢<ruby>字<rt>じ</rt></ruby>');
    });

    it('does not touch code spans, code blocks or attribute values', () => {
      const html = noteToHtml(
        'Read `漢字` and\n\n```\n漢字 in code\n```\n\n[link](https://example/漢字)',
        {
          漢字: 'かんじ',
        },
      )!;
      expect(html).toContain('<code>漢字</code>');
      expect(html).toContain('漢字 in code');
      expect(html).not.toMatch(/href="[^"]*<ruby>/);
    });

    it('finds a listed word that has &, < or a quote in it', () => {
      const html = noteToHtml("R&D and Tom's", { 'R&D': 'r', "Tom's": 't' })!;
      expect(html).toContain('<ruby>R&amp;D<rt>r</rt></ruby>');
      expect(html).toContain('<ruby>Tom&#39;s<rt>t</rt></ruby>');
    });

    it('does not match inside an HTML entity', () => {
      expect(noteToHtml("Tom & Jerry's", { amp: 'x', '39': 'y' })).toBe(
        noteToHtml("Tom & Jerry's"),
      );
    });

    it('leaves existing <ruby> alone so its base text is not wrapped again', () => {
      const html = noteToHtml('<ruby>漢字<rt>かんじ</rt></ruby>', { 漢字: 'かんじ' })!;
      expect(html).toContain('<ruby>漢字<rt>かんじ</rt></ruby>');
      expect(html).not.toContain('<ruby><ruby>');
    });

    it('escapes HTML characters in the reading and skips non-string entries', () => {
      const html = noteToHtml('read 漢字 now', { 漢字: 'a<b&"c' })!;
      expect(html).toContain('<rt>a&#60;b&#38;&#34;c</rt>');
      expect(html).not.toContain('<rt>a<b');
      // non-string reading is dropped
      expect(
        noteToHtml('ignore 漢字', {
          漢字: { nested: 'map' },
        } as unknown as Record<string, string>),
      ).toBe(noteToHtml('ignore 漢字'));
    });
  });
});
