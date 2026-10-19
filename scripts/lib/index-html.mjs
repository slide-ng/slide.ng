// The `index.html` of a theme, an addon or the deck, merged into the page like Slidev does: the inside of its <head> goes
// before </head>, the inside of its <body> after the app. The file is the deck's own code (like `components/`), so it is not escaped.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The inside of the <head> and of the <body> of a page, trimmed. A missing element gives ''. */
export function indexHtmlParts(html) {
  const inside = (tag) =>
    (new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(html)?.[1] ?? '').trim();
  return { head: inside('head'), body: inside('body') };
}

/** The parts of the `index.html` of every root that has one, joined in root order (theme, addons, deck). */
export function rootIndexHtml(roots) {
  const head = [];
  const body = [];
  for (const root of roots) {
    const file = join(root.dir, 'index.html');
    if (!existsSync(file)) continue;
    const parts = indexHtmlParts(readFileSync(file, 'utf8'));
    if (parts.head) head.push(parts.head);
    if (parts.body) body.push(parts.body);
  }
  return { head: head.join('\n'), body: body.join('\n') };
}

/** Puts the parts into the page: the head before </head>, the body after the app's element. */
export function injectIndexHtml(page, { head, body }) {
  let html = page;
  if (head) html = html.replace(/<\/head>/i, () => `${head}\n</head>`);
  if (body) html = html.replace(/<\/app-root>/i, () => `</app-root>\n${body}`);
  return html;
}
