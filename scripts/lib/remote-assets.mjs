// `remoteAssets: true` (headmatter): while building, download the remote images a deck uses and serve them from the
// build itself, so the deck works offline and does not depend on someone else's server.
//
// Only images are taken: the answer must have an `image/*` content type, start with the bytes of a known picture format
// and be at most 20 MB. An address that is not public (loopback, private, link-local, metadata) is refused (safe-fetch.mjs),
// and so is SVG: a downloaded .svg is served from the deck's own address, where it could run script. The address list
// comes from the deck's own text (markdown images, <img src>, CSS url(), and the frontmatter keys that name an image).
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeFetch } from './safe-fetch.mjs';

const MAX_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const FOLDER = 'remote-assets'; // the folder inside the build the pictures end up in

// Where an address can stand and still be an image.
const PATTERNS = [
  /!\[[^\]]*\]\(\s*<?(https?:\/\/[^)\s>]+)/g, //          ![alt](https://...)
  /<img\b[^>]*?\ssrc=["'](https?:\/\/[^"']+)["']/gi, //   <img src="https://...">
  /\burl\(\s*["']?(https?:\/\/[^)"']+)["']?\s*\)/g, //    background: url(https://...)
  /^\s*(?:image|background|backgroundImage|poster):\s*["']?(https?:\/\/[^\s"']+)/gm, // frontmatter: image: https://...
];

/** Every remote image address in a piece of text, without duplicates. */
export function findRemoteImages(text) {
  const found = new Set();
  for (const pattern of PATTERNS) for (const match of text.matchAll(pattern)) found.add(match[1]);
  return [...found];
}

const EXTENSIONS = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/x-icon': '.ico',
};

/** File name in the build for an address: a hash of the address plus the extension that fits the content type. */
export function localName(url, contentType) {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  return `${hash}${EXTENSIONS[contentType.split(';')[0].trim().toLowerCase()] ?? '.img'}`;
}

/** What the first bytes say a picture is: a content type from the list above, 'image/svg+xml' for SVG, or null. */
export function sniffImage(bytes) {
  const starts = (...b) => b.every((v, i) => bytes[i] === v);
  const text = (from, str) => bytes.subarray(from, from + str.length).toString('latin1') === str;
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if (text(0, 'GIF87a') || text(0, 'GIF89a')) return 'image/gif';
  if (text(0, 'RIFF') && text(8, 'WEBP')) return 'image/webp';
  if (text(4, 'ftyp') && (text(8, 'avif') || text(8, 'avis'))) return 'image/avif';
  if (starts(0, 0, 1, 0)) return 'image/x-icon';
  if (/<svg[\s>]/i.test(bytes.subarray(0, 4096).toString('utf8'))) return 'image/svg+xml';
  return null;
}

/**
 * Downloads one picture. Returns `{ name, bytes }`, or null when it is not taken (a warning says why): not an image, SVG,
 * too big, not a public address, a failed request. `options.allowLocal` is for tests that use a local server.
 * @param {string} url @param {(m: string) => any} warn @param {typeof fetch} [fetchImpl] @param {{ allowLocal?: boolean }} [options]
 */
export async function downloadImage(url, warn, fetchImpl, options = {}) {
  try {
    const res = await safeFetch(url, {
      maxBytes: MAX_BYTES,
      timeoutMs: TIMEOUT_MS,
      fetchImpl,
      allowLocal: options.allowLocal,
    });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.toLowerCase().startsWith('image/'))
      return warn(`${url} is not an image (status ${res.status}, type "${type}"), left as it is`);
    const sniffed = sniffImage(res.bytes);
    if (sniffed === 'image/svg+xml')
      return warn(
        `${url} is an SVG picture; it is not downloaded because an SVG can carry script. Left as it is (or save it into the deck's folder)`,
      );
    if (!sniffed) return warn(`${url} does not start like a picture file, left as it is`);
    return { name: localName(url, sniffed), bytes: res.bytes };
  } catch (error) {
    return warn(`could not download ${url} (${error.message}), left as it is`);
  }
}

/**
 * Replaces each downloaded address in `text` by its new relative address (relative to the page's <base>).
 * An address is replaced only as a whole: `a.png` inside `a.png?v=2` is left alone.
 */
export function rewriteAddresses(text, mapping) {
  // Longest first, so an address that starts like another one is not cut.
  const urls = Object.keys(mapping).sort((a, b) => b.length - a.length);
  if (!urls.length) return text;
  const escaped = urls.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // An address ends where the text around it ends it: space, bracket, quote or end of text (a backslash in JSON).
  const whole = new RegExp(`(${escaped.join('|')})(?=$|[\\s)"'<>\\]\\\\])`, 'g');
  return text.replace(whole, (url) => mapping[url]);
}

/** Makes sure `folder` exists and holds nothing (it only ever holds what a previous run wrote). */
export function emptyFolder(folder) {
  mkdirSync(folder, { recursive: true });
  for (const f of readdirSync(folder)) rmSync(join(folder, f), { recursive: true });
}

/**
 * Downloads the images of all slides into `folder` and rewrites the slides' text and frontmatter.
 * Returns how many were bundled. `folder` is emptied first.
 * @param {any[]} slides @param {string} folder @param {(m: string) => any} [warn] @param {typeof fetch} [fetchImpl] @param {{ allowLocal?: boolean }} [options]
 */
export async function bundleRemoteAssets(
  slides,
  folder,
  warn = console.warn,
  fetchImpl,
  options = {},
) {
  // The frontmatter as `key: value` lines (what the frontmatter pattern reads), and as JSON for a url() in other values.
  const keys = (f) =>
    Object.entries(f ?? {})
      .filter(([, v]) => typeof v === 'string')
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
  const texts = slides.map(
    (s) =>
      `${s.content}\n${keys(s.frontmatter)}\n${JSON.stringify(s.frontmatter).replace(/\\"/g, '"')}`,
  );
  const urls = [...new Set(texts.flatMap(findRemoteImages))];
  emptyFolder(folder);
  if (!urls.length) return 0;

  const mapping = {};
  for (const url of urls) {
    const image = await downloadImage(url, warn, fetchImpl, options);
    if (!image) continue;
    writeFileSync(join(folder, image.name), image.bytes);
    mapping[url] = `${FOLDER}/${image.name}`;
  }
  for (const slide of slides) {
    slide.content = rewriteAddresses(slide.content, mapping);
    slide.frontmatter = JSON.parse(rewriteAddresses(JSON.stringify(slide.frontmatter), mapping));
    slide.note = slide.note && rewriteAddresses(slide.note, mapping);
  }
  return Object.keys(mapping).length;
}
