// An embedded post from X (Twitter):  <slide-ng-tweet id="20" />   <slide-ng-tweet url="https://x.com/jack/status/20" />
// It uses X's own widget script (loaded when the component starts), as Slidev does.
import { Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { Dark } from '../lib/dark';
import { loadScript } from './load-script';
import { resolveTweetId } from './tweet-id';
import { Transform } from './transform';
import { T } from '../i18n/t';

interface Twitter {
  widgets: {
    createTweet(id: string, el: HTMLElement, options: object): Promise<HTMLElement | undefined>;
  };
}

@Component({
  selector: 'slide-ng-tweet',
  imports: [Transform, T],
  template: `
    <slide-ng-transform [scale]="scale() || 1">
      <div #box class="tweet slidev-tweet">
        @if (!loaded() || notFound()) {
          <div class="w-30 h-30 my-10px bg-gray-400 bg-opacity-10 rounded-lg flex opacity-50">
            <div class="m-auto animate-pulse text-4xl">
              <div class="i-carbon:logo-twitter"></div>
              @if (notFound()) {
                <span>{{ 'embed.tweetFailed' | t }}</span>
              }
            </div>
          </div>
        }
      </div>
    </slide-ng-transform>
  `,
  styles: ['.slidev-tweet iframe { border-radius: 12px; overflow: hidden; }'],
})
export class Tweet implements OnInit {
  id = input<string | number>();
  url = input<string>();
  scale = input<string | number>();
  conversation = input<string>();
  cards = input<'hidden' | 'visible'>();

  protected loaded = signal(false);
  protected notFound = signal(false);
  private box = viewChild.required<ElementRef<HTMLElement>>('box');
  private dark = inject(Dark);

  async ngOnInit() {
    const tweetId = resolveTweetId(this.id(), this.url());
    if (!tweetId) {
      this.loaded.set(true);
      this.notFound.set(true);
      console.error('Tweet requires a valid id or X post URL.');
      return;
    }
    try {
      await loadScript('https://platform.twitter.com/widgets.js');
      const twttr = (window as unknown as { twttr: Twitter }).twttr;
      // The widget draws into the box; undefined means the post does not exist.
      const element = await twttr.widgets.createTweet(tweetId, this.box().nativeElement, {
        theme: this.dark.isDark() ? 'dark' : 'light',
        conversation: this.conversation() || 'none',
        cards: this.cards(),
      });
      if (element === undefined) this.notFound.set(true);
    } catch (e) {
      console.warn(e);
      this.notFound.set(true);
    }
    this.loaded.set(true);
  }
}
