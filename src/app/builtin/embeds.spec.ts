import { biggestFit } from './auto-fit-text';
import { resolvePostUri } from './blue-sky';
import { resolveTweetId } from './tweet-id';
import { youtubeEmbedSrc } from './youtube-src';

describe('biggestFit', () => {
  it('finds the biggest size that still fits', () => {
    expect(biggestFit(10, 100, (s) => s <= 42)).toBeGreaterThan(41.4);
    expect(biggestFit(10, 100, (s) => s <= 42)).toBeLessThanOrEqual(42);
  });
  it('gives the maximum when everything fits and the minimum when nothing does', () => {
    expect(biggestFit(10, 100, () => true)).toBe(100);
    expect(biggestFit(10, 100, () => false)).toBe(10);
  });
});

describe('resolveTweetId', () => {
  it('prefers the id, else reads it from an address on x.com or twitter.com', () => {
    expect(resolveTweetId(20)).toBe('20');
    expect(resolveTweetId(undefined, 'https://x.com/jack/status/20')).toBe('20');
    expect(
      resolveTweetId(undefined, 'https://twitter.com/jack/status/1392246507793915904?s=20'),
    ).toBe('1392246507793915904');
  });
  it('is undefined when there is neither', () => {
    expect(resolveTweetId()).toBeUndefined();
    expect(resolveTweetId(undefined, 'https://example.com/a')).toBeUndefined();
  });
});

describe('resolvePostUri', () => {
  it('keeps an at:// address as it is, without any request', async () => {
    expect(await resolvePostUri('at://did:plc:abc/app.bsky.feed.post/xyz')).toBe(
      'at://did:plc:abc/app.bsky.feed.post/xyz',
    );
  });
  it('gives up on an address that is not a post', async () => {
    expect(await resolvePostUri('https://example.com/')).toBeUndefined();
    expect(await resolvePostUri('not a url')).toBeUndefined();
  });
});

describe('youtubeEmbedSrc', () => {
  const embed = 'https://www.youtube.com/embed/';
  it('embeds a plain id as it is', () => {
    expect(youtubeEmbedSrc('luoMHjh-XcQ')).toBe(`${embed}luoMHjh-XcQ`);
  });
  it('keeps the start time and other embed options written into the id', () => {
    expect(youtubeEmbedSrc('luoMHjh-XcQ?start=1234')).toBe(`${embed}luoMHjh-XcQ?start=1234`);
    expect(youtubeEmbedSrc('luoMHjh-XcQ?start=10&end=20&list=PL1')).toBe(
      `${embed}luoMHjh-XcQ?start=10&end=20&list=PL1`,
    );
  });
  it('drops parameters that are not embed options', () => {
    expect(youtubeEmbedSrc('luoMHjh-XcQ?start=5&foo=bar&origin=x')).toBe(
      `${embed}luoMHjh-XcQ?start=5`,
    );
    expect(youtubeEmbedSrc('luoMHjh-XcQ?foo=bar')).toBe(`${embed}luoMHjh-XcQ`);
  });
  it('lets start and list win over the id', () => {
    expect(youtubeEmbedSrc('luoMHjh-XcQ?start=5', 90)).toBe(`${embed}luoMHjh-XcQ?start=90`);
    expect(youtubeEmbedSrc('luoMHjh-XcQ', undefined, 'PL1')).toBe(`${embed}luoMHjh-XcQ?list=PL1`);
    expect(youtubeEmbedSrc('luoMHjh-XcQ', NaN)).toBe(`${embed}luoMHjh-XcQ`);
  });
  it('keeps everything in the id inside the path segment and the query of youtube.com', () => {
    const tricky = [
      '../../evil.com/x?start=1',
      'a/b#c?start=1',
      'x?start=1#frag&list=y',
      'x?start=1%26autoplay%3D1&list=a%23b%2F..',
      'x?start="><script>alert(1)</script>',
      '//evil.com',
    ];
    for (const id of tricky) {
      const url = new URL(youtubeEmbedSrc(id));
      expect(url.origin).toBe('https://www.youtube.com');
      expect(url.pathname.split('/').length).toBe(3);
      expect(url.pathname.startsWith('/embed/')).toBe(true);
      expect(url.hash).toBe('');
      for (const name of url.searchParams.keys()) expect(['start', 'list']).toContain(name);
    }
    expect(youtubeEmbedSrc('x?start=1%26autoplay%3D1')).toBe(`${embed}x?start=1%26autoplay%3D1`);
  });
});
