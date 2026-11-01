// An embedded YouTube video:  <slide-ng-youtube id="luoMHjh-XcQ" width="560" height="315" />
// The id may carry YouTube's embed options (`luoMHjh-XcQ?start=1234`); `start` and `list` can also be given on their own.
import { Component, computed, inject, input, numberAttribute } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { youtubeEmbedSrc } from './youtube-src';

@Component({
  selector: 'slide-ng-youtube',
  host: { style: 'display: inline-block' },
  templateUrl: './youtube.html',
})
export class Youtube {
  id = input.required<string>();
  width = input(undefined, {
    transform: (v: unknown) => (v == null ? undefined : numberAttribute(v)),
  });
  height = input(undefined, {
    transform: (v: unknown) => (v == null ? undefined : numberAttribute(v)),
  });
  // Seconds, or YouTube's own form (`1m30s`).
  start = input(undefined, {
    transform: (v: unknown) => (v == null ? undefined : typeof v === 'number' ? v : String(v)),
  });
  list = input<string>();
  private sanitizer = inject(DomSanitizer);
  // Angular does not allow a computed address for an iframe unless it is marked as trusted; it is YouTube's own address,
  // with the id as one encoded path segment and only YouTube's embed parameters in the query.
  protected src = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      youtubeEmbedSrc(this.id(), this.start(), this.list()),
    ),
  );
}
