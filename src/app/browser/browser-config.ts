import { HEADMATTER } from '../../slides/generated';

export interface BrowserTab {
  name: string;
  url: string;
}

export interface BrowserConfig {
  enabled: boolean;
  links: boolean;
  tabs: BrowserTab[];
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
  if (value === false) return { enabled: false, links: false, tabs: [] };
  const config = obj(value) ? value : {};
  const tabs = (Array.isArray(config['tabs']) ? config['tabs'] : []).flatMap((tab) => {
    const url = webAddress(obj(tab) ? tab['url'] : tab);
    if (!url) return [];
    const name = obj(tab) && typeof tab['name'] === 'string' ? tab['name'].trim() : '';
    return [{ name: name || tabTitle(url), url }];
  });
  return { enabled: true, links: config['links'] !== false, tabs };
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
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed) && !/^localhost:\d/i.test(trimmed)) return null;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(trimmed);
  return webAddress(`${local ? 'http' : 'https'}://${trimmed}`);
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
