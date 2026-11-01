// Cloudflare Workers: `npx wrangler deploy cloudflare.js --name deck-proxy`, then set DECK_ORIGINS (Settings > Variables).
// The deck's proxy address is https://deck-proxy.<you>.workers.dev/?url=%s
import { decksFrom, proxy } from './browser-proxy.js';

export default {
  fetch: (request, env) => proxy(request, { decks: decksFrom(env.DECK_ORIGINS) }),
};
