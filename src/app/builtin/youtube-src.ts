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

/** `https://www.youtube.com/embed/<id>?<query>`. The id is encoded as one path segment; `start` and `list` win over the id's query. */
export function youtubeEmbedSrc(id: string, start?: number, list?: string): string {
  const mark = id.indexOf('?');
  const video = mark < 0 ? id : id.slice(0, mark);
  const query = new URLSearchParams(mark < 0 ? '' : id.slice(mark + 1).split('#')[0]);
  const params = new URLSearchParams();
  for (const [name, value] of query) if (EMBED_PARAMS.has(name)) params.append(name, value);
  if (start != null && Number.isFinite(start))
    params.set('start', String(Math.max(0, Math.floor(start))));
  if (list) params.set('list', list);
  const search = params.toString();
  return `https://www.youtube.com/embed/${encodeURIComponent(video.trim())}${search ? `?${search}` : ''}`;
}
