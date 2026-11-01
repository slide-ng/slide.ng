// Netlify: copy this folder to netlify/edge-functions/deck-proxy/ of the deck's repository, with browser-proxy.js in it, and set
// DECK_ORIGINS in the site's environment variables (the deck's own address, such as https://my-talk.netlify.app).
// The deck's proxy address is https://<site>/proxy?url=%s
import { decksFrom, proxy } from './browser-proxy.js';

export default (request) => proxy(request, { decks: decksFrom(Netlify.env.get('DECK_ORIGINS')) });

export const config = { path: '/proxy' };
