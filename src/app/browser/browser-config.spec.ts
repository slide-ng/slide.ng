import { describe, expect, it } from 'vitest';
import {
  linkForBrowser,
  readBrowserConfig,
  tabTitle,
  typedAddress,
  webAddress,
} from './browser-config';

describe('readBrowserConfig', () => {
  it('is on, with links and no tabs, when the headmatter says nothing', () => {
    expect(readBrowserConfig(undefined)).toEqual({ enabled: true, links: true, tabs: [] });
  });
  it('is off with `browser: false`', () => {
    expect(readBrowserConfig(false)).toEqual({ enabled: false, links: false, tabs: [] });
  });
  it('reads the tabs, names them by host when unnamed, and drops what is not a web address', () => {
    const config = readBrowserConfig({
      links: false,
      tabs: [
        { name: 'Docs', url: 'https://angular.dev/overview' },
        'https://www.github.com/slide-ng',
        { name: 'bad', url: 'javascript:alert(1)' },
        { url: 'not a url' },
      ],
    });
    expect(config.links).toBe(false);
    expect(config.tabs).toEqual([
      { name: 'Docs', url: 'https://angular.dev/overview' },
      { name: 'github.com', url: 'https://www.github.com/slide-ng' },
    ]);
  });
});

describe('webAddress', () => {
  it('keeps http and https only', () => {
    expect(webAddress('https://a.dev')).toBe('https://a.dev/');
    expect(webAddress('http://localhost:3000/x')).toBe('http://localhost:3000/x');
    for (const v of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'x', 3])
      expect(webAddress(v)).toBeNull();
  });
});

describe('typedAddress', () => {
  it('adds https to a typed host, http to a local one', () => {
    expect(typedAddress('angular.dev')).toBe('https://angular.dev/');
    expect(typedAddress(' localhost:4200/demo ')).toBe('http://localhost:4200/demo');
    expect(typedAddress('http://example.com')).toBe('http://example.com/');
  });
  it('refuses other schemes and text with spaces', () => {
    expect(typedAddress('javascript:alert(1)')).toBeNull();
    expect(typedAddress('two words')).toBeNull();
    expect(typedAddress('')).toBeNull();
  });
});

describe('linkForBrowser', () => {
  const link = (href: string, attrs: string[] = []) => ({
    href,
    hasAttribute: (name: string) => attrs.includes(name),
  });
  it('takes links to other sites', () => {
    expect(linkForBrowser(link('https://angular.dev/'), 'http://localhost:4230')).toBe(
      'https://angular.dev/',
    );
  });
  it('leaves links of the deck itself, downloads and other schemes alone', () => {
    expect(linkForBrowser(link('http://localhost:4230/3'), 'http://localhost:4230')).toBeNull();
    expect(linkForBrowser(link('https://a.dev/f.pdf', ['download']), 'http://x')).toBeNull();
    expect(linkForBrowser(link('mailto:a@b.c'), 'http://x')).toBeNull();
  });
});

describe('tabTitle', () => {
  it('is the host without www', () => {
    expect(tabTitle('https://www.example.com/a')).toBe('example.com');
  });
});
