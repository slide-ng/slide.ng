// Vercel: put this file in api/ of the deck's repository and browser-proxy.js in api/_lib/, and set DECK_ORIGINS in the
// project's environment variables (the deck's own address, such as https://my-talk.vercel.app).
// The deck's proxy address is https://<project>.vercel.app/api/proxy?url=%s
import { decksFrom, proxy } from './_lib/browser-proxy.js';

export const config = { runtime: 'edge' };

export default (request) => proxy(request, { decks: decksFrom(process.env.DECK_ORIGINS) });
