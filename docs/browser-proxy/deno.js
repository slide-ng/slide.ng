// Deno Deploy: deploy this file (with browser-proxy.js next to it) and set the DECK_ORIGINS environment variable.
// The deck's proxy address is https://<project>.deno.dev/?url=%s
import { decksFrom, proxy } from './browser-proxy.js';

Deno.serve((request) => proxy(request, { decks: decksFrom(Deno.env.get('DECK_ORIGINS')) }));
