import { scopedKey } from '../lib/deck-scope';
import { SyncTransport } from './transport';

// Windows of the same browser (same address) talk through a BroadcastChannel.
// It needs no server, so it also works in a static build.
export class BroadcastTransport implements SyncTransport {
  // Every deck of one origin (or every folder opened from disk) would share the channel, so it carries the deck's scope
  // (deck-scope.ts).
  private channel = new BroadcastChannel(scopedKey('slide-ng-sync'));

  send(channel: string, data: unknown) {
    this.channel.postMessage({ channel, data });
  }

  listen(handler: (channel: string, data: unknown) => void) {
    this.channel.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m && typeof m === 'object' && typeof m.channel === 'string') handler(m.channel, m.data);
    };
  }
}
