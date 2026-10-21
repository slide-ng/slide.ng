// A host's Content-Security-Policy `script-src 'self'` refuses inline scripts. The built index.html has some (the critical
// CSS loader that Angular adds, which switches the full stylesheet on), so the page would stay unstyled there. They move to
// files of their own next to index.html: a classic `<script src>` runs at the same point of the page as the inline one did.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// A script without attributes, or with only a JavaScript type; `src`, JSON data and modules are left as they are.
const INLINE_SCRIPT = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;

/** The page with each inline script loaded from a file. Returns `{ html, files }`, `files` being `{ name, text }`. */
export function externalScripts(html) {
  const files = [];
  const page = html.replace(INLINE_SCRIPT, (all, text) => {
    if (!text.trim()) return all;
    // Named after the content, so a host may cache it for good like the other hashed files.
    const name = `inline-${createHash('sha256').update(text).digest('hex').slice(0, 12)}.js`;
    files.push({ name, text });
    return `<script src="${name}"></script>`;
  });
  return { html: page, files };
}

/** Rewrites `dir/index.html` in place and writes its scripts next to it. Returns the names of the files written. */
export function moveInlineScripts(dir) {
  const { html, files } = externalScripts(readFileSync(join(dir, 'index.html'), 'utf8'));
  for (const f of files) writeFileSync(join(dir, f.name), f.text);
  writeFileSync(join(dir, 'index.html'), html);
  return files.map((f) => f.name);
}
