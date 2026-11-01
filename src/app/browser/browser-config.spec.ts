import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH,
  addressOrSearch,
  isProxyOrigin,
  linkForBrowser,
  proxiedAddress,
  readBrowserConfig,
  tabTitle,
  typedAddress,
  webAddress,
} from './browser-config';

describe('readBrowserConfig', () => {
  it('is on, with links and no tabs, when the headmatter says nothing', () => {
    expect(readBrowserConfig(undefined)).toEqual({
      enabled: true,
      links: true,
      tabs: [],
      search: DEFAULT_SEARCH,
    });
  });
  it('is off with `browser: false`', () => {
    expect(readBrowserConfig(false)).toEqual({
      enabled: false,
      links: false,
      tabs: [],
      search: DEFAULT_SEARCH,
    });
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

describe('addressOrSearch', () => {
  it('opens an address, and searches for anything else', () => {
    expect(addressOrSearch('angular.dev')).toBe('https://angular.dev/');
    expect(addressOrSearch('angular signals')).toBe('https://duckduckgo.com/?q=angular%20signals');
    expect(addressOrSearch('what is x', 'https://duckduckgo.com/?q=%s')).toBe(
      'https://duckduckgo.com/?q=what%20is%20x',
    );
    expect(addressOrSearch('   ')).toBeNull();
  });
  it('searches for one word, and opens a name with a dot, localhost or an address', () => {
    expect(addressOrSearch('erkam')).toBe('https://duckduckgo.com/?q=erkam');
    expect(addressOrSearch('angular')).toBe('https://duckduckgo.com/?q=angular');
    expect(addressOrSearch('erkam.dev')).toBe('https://erkam.dev/');
    expect(addressOrSearch('erkam.dev:8080/x')).toBe('https://erkam.dev:8080/x');
    expect(addressOrSearch('localhost:4200')).toBe('http://localhost:4200/');
    expect(addressOrSearch('192.168.1.5:8080')).toBe('https://192.168.1.5:8080/');
    expect(addressOrSearch('3.14')).toBe('https://duckduckgo.com/?q=3.14');
  });
  it('takes the search address of the headmatter only with %s and a web address', () => {
    expect(readBrowserConfig({ search: 'https://s.dev/?q=%s' }).search).toBe('https://s.dev/?q=%s');
    expect(readBrowserConfig({ search: 'javascript:%s' }).search).toBe(DEFAULT_SEARCH);
    expect(readBrowserConfig({ search: 'https://s.dev/' }).search).toBe(DEFAULT_SEARCH);
  });
});

describe('proxiedAddress', () => {
  const proxy = { key: 'k1', port: 5000 };
  it('is the same address as the proxy makes', () => {
    expect(proxiedAddress('https://github.com/a?b#c', proxy)).toBe(
      'http://github.com.https.k1.localhost:5000/a?b#c',
    );
    expect(proxiedAddress('http://localhost:4200/', proxy)).toBe(
      'http://localhost.http-4200.k1.localhost:5000/',
    );
  });
  it('knows the origins of the proxy', () => {
    expect(isProxyOrigin('http://github.com.https.k1.localhost:5000', proxy)).toBe(true);
    expect(isProxyOrigin('http://github.com.https.k2.localhost:5000', proxy)).toBe(false);
    expect(isProxyOrigin('http://evil.dev', proxy)).toBe(false);
  });
});
