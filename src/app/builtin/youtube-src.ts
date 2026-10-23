// The embed address of a YouTube video, from an id that may carry a query: `luoMHjh-XcQ?start=1234`.

// YouTube's documented embed parameters; anything else in the id is dropped.
const EMBED_PARAMS = new Set([
  'autoplay',
  'cc_lang_pref',
  'cc_load_policy',
  'color',
  'controls',
  'disablekb',
  'end',
  'fs',
  'hl',
  'iv_load_policy',
  'list',
  'listType',
  'loop',
  'mute',
  'playlist',
  'playsinline',
  'rel',
  'start',
]);

/**
 * A start time in seconds, written the ways YouTube takes it: `90`, `90s`, `1m30s`, `1h2m3s`; a part of a second is dropped (`12.5` is 12). Undefined for anything else.
 */
export function youtubeSeconds(value: string | number): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s?)?$/i.exec(value.trim());
  if (!m || !value.trim()) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Math.floor(Number(m[3] ?? 0));
}

/**
 * `https://www.youtube.com/embed/<id>?<query>`. The id is encoded as one path segment; `start` and `list` win over the
 * id's query. A start time (`start`, or the `t` of a shared link) is turned into seconds; one that is not a time is
 * dropped with a warning.
 */
export function youtubeEmbedSrc(
  id: string,
  start?: string | number,
  list?: string,
  warn: (message: string) => void = (m) => console.warn(m),
): string {
  const mark = id.indexOf('?');
  const video = mark < 0 ? id : id.slice(0, mark);
  const query = new URLSearchParams(mark < 0 ? '' : id.slice(mark + 1).split('#')[0]);
  const params = new URLSearchParams();
  const seconds = (value: string | number, name: string) => {
    const s = youtubeSeconds(value);
    if (s === undefined)
      warn(
        `[slide.ng] <slide-ng-youtube>: ${name}="${value}" is not a time such as 90 or 1m30s, ignored`,
      );
    return s;
  };
  for (const [name, value] of query) {
    if (name === 'start' || name === 't') {
      const s = seconds(value, name);
      if (s !== undefined) params.set('start', String(s));
    } else if (EMBED_PARAMS.has(name)) params.append(name, value);
  }
  if (start != null && start !== '') {
    const s = seconds(start, 'start');
    if (s !== undefined) params.set('start', String(s));
  }
  if (list) params.set('list', list);
  const search = params.toString();
  return `https://www.youtube.com/embed/${encodeURIComponent(video.trim())}${search ? `?${search}` : ''}`;
}
