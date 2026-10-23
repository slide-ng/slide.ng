import { deckScope, scopedKey } from './deck-scope';

describe('deckScope', () => {
  it('is empty for a deck at the root of a web address, or without a base', () => {
    expect(deckScope({ protocol: 'https:', pathname: '/talk/3' }, 'https://x.example/')).toBe('');
    expect(deckScope({ protocol: 'http:', pathname: '/' }, null)).toBe('');
  });

  it('is the base path of a deck under a sub-path, whatever slide the address shows', () => {
    const a = deckScope(
      { protocol: 'https:', pathname: '/decks/a/3' },
      'https://x.example/decks/a/',
    );
    expect(a).toBe('@/decks/a/');
    expect(
      deckScope({ protocol: 'https:', pathname: '/decks/a/' }, 'https://x.example/decks/a/'),
    ).toBe(a);
    expect(
      deckScope({ protocol: 'https:', pathname: '/decks/b/1' }, 'https://x.example/decks/b/'),
    ).not.toBe(a);
  });

  it('is the folder of the page for a file', () => {
    expect(deckScope({ protocol: 'file:', pathname: '/home/me/talks/a/index.html' }, null)).toBe(
      '@/home/me/talks/a/',
    );
  });

  it('differs between two folders and stays the same for one', () => {
    const a = deckScope({ protocol: 'file:', pathname: '/talks/a/index.html' }, null);
    expect(a).not.toBe(deckScope({ protocol: 'file:', pathname: '/talks/b/index.html' }, null));
    expect(a).toBe(deckScope({ protocol: 'file:', pathname: '/talks/a/other.html' }, null));
  });
});

describe('scopedKey', () => {
  it("adds the scope of the page's <base href>", () => {
    expect(scopedKey('slide-ng-sync')).toBe('slide-ng-sync');
    const base = document.createElement('base');
    base.href = '/decks/a/';
    document.head.append(base);
    try {
      expect(scopedKey('slide-ng-sync')).toBe('slide-ng-sync@/decks/a/');
    } finally {
      base.remove();
    }
  });
});
