import {
  RENAMED_ATTRIBUTES,
  RENAMED_ELEMENTS,
  RENAMED_PASCAL,
  assertNoRenamedNames,
} from './renamed.mjs';
import { slideSource, slideSources } from './emit.mjs';
import { initHighlighter } from './code/highlighter.mjs';

beforeAll(() => initHighlighter({ langs: ['ts', 'html'] }));

const check =
  (html: string, own: string[] = []) =>
  () =>
    assertNoRenamedNames(html, 4, own);

describe('assertNoRenamedNames', () => {
  it('names the new attribute for an old one, with modifiers or as a binding', () => {
    expect(check('<li v-click>a</li>')).toThrow('renamed to slide-ng-click');
    expect(check('<li v-after="1">a</li>')).toThrow('renamed to slide-ng-after');
    expect(check('<li v-click-hide>a</li>')).toThrow('renamed to slide-ng-click-hide');
    expect(check('<li [v-click]="[1, 2]">a</li>')).toThrow('renamed to slide-ng-click');
    expect(check('<span v-mark.red.circle="2">a</span>')).toThrow('renamed to slide-ng-mark');
    expect(check('<div v-motion :initial="{ x: 0 }"></div>')).toThrow('renamed to slide-ng-motion');
    expect(check('<img v-drag="[1,2,3,4]">')).toThrow('renamed to slide-ng-drag');
  });

  it('names the new element for an old one', () => {
    for (const [oldName, newName] of Object.entries(RENAMED_ELEMENTS))
      expect(check(`<${oldName} a="1"></${oldName}>`)).toThrow(newName);
  });

  it('says that <v-click> and <v-after> are attributes on a <div>', () => {
    expect(check('<v-click>a</v-click>')).toThrow(
      '"<v-click>" has no element of its own: use <div slide-ng-click>',
    );
    expect(check('<VAfter>a</VAfter>')).toThrow('use <div slide-ng-after>');
  });

  it("catches Slidev's PascalCase component names and <slidev-video>", () => {
    for (const [oldName, newName] of Object.entries(RENAMED_PASCAL))
      expect(check(`<${oldName} a="1"></${oldName}>`)).toThrow(newName);
    expect(check('<Toc />')).toThrow('"<Toc>" was renamed to slide-ng-toc');
    expect(check('<SlidevVideo slide-ng-click controls></SlidevVideo>')).toThrow(
      'renamed to slide-ng-video',
    );
    expect(check('<slidev-video controls></slidev-video>')).toThrow('renamed to slide-ng-video');
    expect(check('<Link to="2">two</Link>')).toThrow('renamed to slide-ng-link');
    expect(check('<link rel="stylesheet" href="a.css">')).not.toThrow();
  });

  it('lists the attribute and the element of the same old name', () => {
    expect(check('<v-click v-click>a</v-click>')).toThrow(
      /"<v-click>" has no element.*"v-click" was renamed to slide-ng-click/,
    );
  });

  it('says which slide it found the old name in', () => {
    expect(check('<v-clicks>x</v-clicks>')).toThrow('slide 4');
  });

  it('lets the new names pass', () => {
    const fine = [
      '<li slide-ng-click>a</li>',
      '<span slide-ng-mark.red.circle="2">a</span>',
      '<slide-ng-clicks><li>a</li></slide-ng-clicks>',
      '<slide-ng-toc columns="2" />',
      '<p class="v-click">text mentions v-click</p>',
      '<div data-v-click="1"></div>',
    ];
    for (const html of fine) expect(check(html)).not.toThrow();
  });

  it('keeps matching strictly: only whole attribute and tag names', () => {
    expect(check('<li v-clicky>a</li>')).not.toThrow();
    expect(check('<li my-v-click>a</li>')).not.toThrow();
    expect(check('<v-clickable>a</v-clickable>')).not.toThrow();
    expect(check('<arrows></arrows><transforms></transforms>')).not.toThrow();
  });

  it('leaves a name alone that the deck declares as its own component', () => {
    expect(check('<arrow x="1" />', ['arrow'])).not.toThrow();
    expect(check('<arrow x="1" />')).toThrow('renamed to slide-ng-arrow');
  });

  it('has a new name for every old one', () => {
    for (const to of [
      ...Object.values(RENAMED_ATTRIBUTES),
      ...Object.values(RENAMED_ELEMENTS),
      ...Object.values(RENAMED_PASCAL),
    ])
      expect(to).toMatch(/^(<div )?slide-ng-/);
  });
});

describe('slideSource with an old name', () => {
  const md = (content: string) => ({ title: null, frontmatter: {}, content, note: undefined });
  it('stops with the helpful message', () => {
    expect(() => slideSource(md('- a\n\n<v-clicks>\n\n- b\n\n</v-clicks>'), 2)).toThrow(
      'renamed to slide-ng-clicks',
    );
  });
  it('does not look into code', () => {
    expect(() =>
      slideSource(md('```html\n<v-click>x</v-click>\n```\n\n`<slide-toc />`'), 2),
    ).not.toThrow();
  });
});

describe('slideSources with old names', () => {
  const md = (content: string) => ({ title: null, frontmatter: {}, content, note: undefined });
  it('lists the old names of every slide in one error', () => {
    const slides = [md('<Toc />'), md('fine'), md('<li v-click>a</li>')];
    expect(() => slideSources({ slides })).toThrow(
      /slide 1: "<Toc>" was renamed to slide-ng-toc.*\n.*slide 3: "v-click" was renamed/,
    );
  });
});
