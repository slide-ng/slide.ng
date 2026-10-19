// The two tools that only the dev server has (Slidev's `slidev-get-info` and `slidev-goto-slide`): they need the running
// presentation. `ctx.hub` is the sync hub (scripts/dev/ws-hub.mjs) and `ctx.url` the address the client used.
import { relative } from 'node:path';
import { z } from 'zod';
import { sendToAll } from '../dev/ws-hub.mjs';
import { parseDeck } from '../lib/parse-deck.mjs';

/** The two `shared` messages that move every window: presenters follow a viewer's move, viewers a presenter's. */
export function gotoMessages(page, clicks, time = Date.now()) {
  return ['viewer', 'presenter'].map((type) => ({
    channel: 'shared',
    data: { page, clicks, lastUpdate: { id: 'slide-ng-mcp', type, time } },
  }));
}

export const DEV_TOOLS = [
  {
    name: 'get_info',
    description:
      'About the running deck: the entry file, its title, the number of slides, the markdown files it is made of, the address of the dev server and the slide the presentation is on (null before a window reported one).',
    schema: {},
    async run(ctx) {
      const deck = await parseDeck(ctx.entry);
      return {
        entry: ctx.entry,
        title: deck.headmatter.title ?? deck.slides[0]?.title ?? null,
        slides: deck.slides.length,
        files: [...new Set(deck.files)].map((f) => relative(ctx.root, f)),
        url: ctx.url,
        current: ctx.hub?.position ?? null,
      };
    },
  },
  {
    name: 'goto_slide',
    description:
      'Move every open window of the presentation (the presenter and the audience) to a slide, and optionally to a click step of it.',
    schema: {
      no: z.number().int().min(1).describe('slide number, counting from 1'),
      clicks: z.number().int().min(0).max(999).optional().describe('click step (default 0)'),
    },
    async run(ctx, { no, clicks = 0 }) {
      const { slides } = await parseDeck(ctx.entry);
      if (no > slides.length)
        throw new Error(`there is no slide ${no} (the deck has ${slides.length})`);
      let windows = 0;
      if (ctx.hub) {
        for (const message of gotoMessages(no, clicks)) windows = sendToAll(ctx.hub, message);
        ctx.hub.position = { page: no, clicks };
      }
      return { no, clicks, windows };
    },
  },
];
