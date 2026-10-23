// A host's Content-Security-Policy `script-src 'self'` refuses inline scripts. The built index.html has some (the critical
// CSS loader that Angular adds, which switches the full stylesheet on, and those of the deck's own index.html), so the page
// would stay unstyled there. They move to files of their own next to index.html: a classic `<script src>` runs at the same
// point of the page as the inline one did, a module stays a module.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
// The types a browser runs as a classic script (an empty `type` too).
const CLASSIC = new Set([
  '',
  'text/javascript',
  'application/javascript',
  'application/ecmascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);
// Inline types the policy refuses too but that cannot be a file: an import map or speculation rules.
const UNMOVABLE = new Set(['importmap', 'speculationrules']);

function parseAttributes(text) {
  const list = [];
  for (const m of text.matchAll(ATTRIBUTE))
    list.push({ name: m[1], value: m[2] ?? m[3] ?? m[4] ?? null });
  return list;
}

function writeAttributes(list) {
  return list
    .map(({ name, value }) =>
      value === null
        ? ` ${name}`
        : ` ${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`,
    )
    .join('');
}

/**
 * The page with each inline script loaded from a file. Returns `{ html, files, left }`: `files` are `{ name, text }`, `left`
 * the types of the inline scripts the policy still refuses (an import map, speculation rules).
 * A classic script (no `type`, or a JavaScript one) and a module move, keeping their other attributes (`data-cfasync`, `id`,
 * `nomodule`, ...); a classic script's `async` and `defer`, which an inline script ignores, are dropped so that it runs at the
 * same point. A script with a `src`, an empty one and data blocks (JSON, `ld+json`, templates) are left as they are.
 */
export function externalScripts(html) {
  const files = [];
  const left = [];
  const page = html.replace(SCRIPT, (all, attributeText, text) => {
    if (!text.trim()) return all;
    const attributes = parseAttributes(attributeText);
    if (attributes.some((a) => a.name.toLowerCase() === 'src')) return all;
    const typeAttribute = attributes.find((a) => a.name.toLowerCase() === 'type');
    const type = (typeAttribute?.value ?? '').trim().toLowerCase();
    const module = type === 'module';
    if (!module && !CLASSIC.has(type)) {
      if (UNMOVABLE.has(type)) left.push(type);
      return all;
    }
    // Named after the content, so a host may cache it for good like the other hashed files.
    const name = `inline-${createHash('sha256').update(text).digest('hex').slice(0, 12)}.js`;
    if (!files.some((f) => f.name === name)) files.push({ name, text });
    const kept = attributes.filter((a) => {
      const n = a.name.toLowerCase();
      if (module) return true;
      return n !== 'async' && n !== 'defer' && !(n === 'type' && CLASSIC.has(type));
    });
    return `<script${writeAttributes(kept)} src="${name}"></script>`;
  });
  return { html: page, files, left };
}

/**
 * Rewrites `dir/index.html` in place and writes its scripts next to it. Returns the names of the files written, and warns
 * (through `warn`) about each inline script that is left and that a strict host refuses.
 */
export function moveInlineScripts(dir, warn = (message) => console.warn(message)) {
  const { html, files, left } = externalScripts(readFileSync(join(dir, 'index.html'), 'utf8'));
  for (const f of files) writeFileSync(join(dir, f.name), f.text);
  writeFileSync(join(dir, 'index.html'), html);
  for (const type of left) {
    warn(
      `warning: index.html has an inline <script type="${type}">, which a host with Content-Security-Policy script-src 'self' refuses (docs/HOSTING.md).`,
    );
  }
  return files.map((f) => f.name);
}
