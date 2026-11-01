import { HEADMATTER } from '../../slides/generated';

export interface BrowserTab {
  name: string;
  url: string;
}

export interface BrowserConfig {
  enabled: boolean;
  links: boolean;
  tabs: BrowserTab[];
  search: string | null;
}

export const DEFAULT_SEARCH = 'https://duckduckgo.com/?q=%s';
export const FRAMABLE_SEARCH = 'https://www.bing.com/search?q=%s';

export const SEARCH_ENGINES = [
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/w/index.php?search=%s' },
] as const;

export const searchAddress = (value: unknown): string | null =>
  typeof value === 'string' && value.includes('%s') && webAddress(value.replace('%s', 'x'))
    ? value
    : null;

export interface WebProxy {
  key: string;
  port: number;
}

const obj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function webAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function readBrowserConfig(value: unknown): BrowserConfig {
  if (value === false) return { enabled: false, links: false, tabs: [], search: null };
  const config = obj(value) ? value : {};
  const tabs = (Array.isArray(config['tabs']) ? config['tabs'] : []).flatMap((tab) => {
    const url = webAddress(obj(tab) ? tab['url'] : tab);
    if (!url) return [];
    const name = obj(tab) && typeof tab['name'] === 'string' ? tab['name'].trim() : '';
    return [{ name: name || tabTitle(url), url }];
  });
  return {
    enabled: true,
    links: config['links'] !== false,
    tabs,
    search: searchAddress(config['search']),
  };
}

export const deckBrowserConfig = (): BrowserConfig => readBrowserConfig(HEADMATTER['browser']);

export function tabTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || url;
  } catch {
    return url;
  }
}

export function typedAddress(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return webAddress(trimmed);
  if (/^[a-z][a-z\d+.-]*:(?!\d)/i.test(trimmed)) return null;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(trimmed);
  const url = webAddress(`${local ? 'http' : 'https'}://${trimmed}`);
  if (!url) return null;
  const typedHost = trimmed.split(/[/:?#]/)[0];
  const named = /\.[a-z][a-z\d-]+$/i.test(typedHost);
  const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(typedHost);
  return local || named || ip ? url : null;
}

export function linkForBrowser(
  link: { href: string; target?: string; hasAttribute(name: string): boolean },
  pageOrigin: string,
): string | null {
  if (link.hasAttribute('download')) return null;
  const url = webAddress(link.href);
  if (!url || new URL(url).origin === pageOrigin) return null;
  return url;
}

export function addressOrSearch(text: string, search = DEFAULT_SEARCH): string | null {
  const address = typedAddress(text);
  if (address) return address;
  const query = text.trim();
  return query ? search.replace('%s', encodeURIComponent(query)) : null;
}

export function proxiedAddress(url: string, proxy: WebProxy): string {
  const u = new URL(url);
  const scheme = u.protocol.slice(0, -1);
  const label = u.port ? `${scheme}-${u.port}` : scheme;
  return `http://${u.hostname}.${label}.${proxy.key}.localhost:${proxy.port}${u.pathname}${u.search}${u.hash}`;
}

export function isProxyOrigin(origin: string, proxy: WebProxy): boolean {
  try {
    const u = new URL(origin);
    return u.hostname.endsWith(`.${proxy.key}.localhost`) && Number(u.port) === proxy.port;
  } catch {
    return false;
  }
}
