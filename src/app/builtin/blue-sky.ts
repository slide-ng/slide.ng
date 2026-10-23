// An embedded Bluesky post:  <slide-ng-blue-sky uri="at://did:plc:.../app.bsky.feed.post/..." />
//                            <slide-ng-blue-sky uri="https://bsky.app/profile/sli.dev/post/3lgwg2vy44s2q" />
// Uses Bluesky's own embed script. A post address is first turned into an `at://` address with Bluesky's public API.
import { Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { Dark } from '../lib/dark';
import { loadScript } from './load-script';
import { Transform } from './transform';
import { T } from '../i18n/t';

const POST_URL = /^\/profile\/([^/]+)\/post\/([^/?#]+)$/;
const API = 'https://public.api.bsky.app/xrpc';

/** `at://` address of a post, from either kind of address. undefined when it cannot be found. */
export async function resolvePostUri(input: string): Promise<string | undefined> {
  if (input.startsWith('at://')) return input;
  try {
    const m = POST_URL.exec(new URL(input).pathname);
    if (!m) return undefined;
    const handle = await (
      await fetch(
        `${API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(decodeURIComponent(m[1]))}`,
      )
    ).json();
    return handle.did
      ? `at://${handle.did}/app.bsky.feed.post/${decodeURIComponent(m[2])}`
      : undefined;
  } catch {
    return undefined;
  }
}

@Component({
  selector: 'slide-ng-blue-sky',
  imports: [Transform, T],
  template: `
    <slide-ng-transform [scale]="scale() || 1">
      <div #box class="slidev-bluesky">
        @if (uri2()) {
          <blockquote
            class="bluesky-embed"
            [attr.data-bluesky-uri]="uri2()"
            [attr.data-bluesky-embed-color-mode]="dark.isDark() ? 'dark' : 'light'"
          ></blockquote>
        }
        @if (!loaded() || notFound()) {
          <div class="h-30 w-30 my-10px bg-gray-400 bg-opacity-10 rounded-lg flex opacity-50">
            <div class="m-auto animate-pulse text-4xl">
              <div class="i-carbon:logo-twitter"></div>
              @if (notFound()) {
                <span>{{ 'embed.blueskyFailed' | t }}</span>
              }
            </div>
          </div>
        }
      </div>
    </slide-ng-transform>
  `,
  styles: ['.slidev-bluesky .bluesky-embed iframe { border-radius: 12px; overflow: hidden; }'],
})
export class BlueSky implements OnInit {
  uri = input.required<string>();
  scale = input<string | number>();

  protected dark = inject(Dark);
  protected uri2 = signal(''); // the resolved `at://` address
  protected loaded = signal(false);
  protected notFound = signal(false);
  private box = viewChild.required<ElementRef<HTMLElement>>('box');

  async ngOnInit() {
    const resolved = await resolvePostUri(this.uri());
    if (!resolved) {
      this.notFound.set(true);
      this.loaded.set(true);
      return;
    }
    this.uri2.set(resolved);
    try {
      await loadScript('https://embed.bsky.app/static/embed.js');
      // The script finds <blockquote class="bluesky-embed"> in the box and replaces it with an iframe.
      setTimeout(() =>
        (window as unknown as { bluesky?: { scan(el?: HTMLElement): void } }).bluesky?.scan(
          this.box().nativeElement,
        ),
      );
    } catch (e) {
      console.warn(e);
      this.notFound.set(true);
    }
    this.loaded.set(true);
  }
}
