---
name: presenter-view
description: Presenter page, notes page, synced windows and laser pointer
---

# Presenter

- `/presenter` (`/presenter/3`) or the presenter button in the bar: current slide, next step preview, notes with click markers, a clicks slider and the timer. The layout button cycles **three** arrangements.
- The audience page (`/3`) in another window or device follows the presenter. `/notes` shows only the notes and follows too.
- Windows of one browser follow each other with no server (BroadcastChannel). Other devices need the dev server (WebSocket), see `presenter-remote.md`.
- The presenter's mouse is shown to the audience as a pointer or a red laser dot (settings menu or the bar button).
- `presenter: false` has no presenter page, button or menu entry; `dev` / `build` limit it, see `presenter-switches.md`.
- Screen Mirror: the presenter page can show a shared window instead of the slide.
- Click preview (slide.ng's own, not Slidev): the eye button in the presenter's bar or `u` draws the whole current slide on the presenter page. Parts of later clicks are greyed out, the next click's part is brighter with a dashed outline, each has a badge with its click number; clicking a badge or a greyed-out part goes to that click in every window. The audience is unchanged. A switch shows only its current child; code steps, magic-move, marks and motion stay at the current click with a badge. Theme variables: `--slide-ng-ghost-opacity`, `--slide-ng-ghost-next-opacity`, `--slide-ng-ghost-next`, `--slide-ng-ghost-badge-background`, `--slide-ng-ghost-badge-foreground`. Not in the notes PDF.
- In a built folder opened from disk the presenter is at `index.html#/presenter/1`, see `offline-folder.md`.

<!-- verify -->

```md
---
title: Presenter
---

# Presenter view

Open `/presenter/1` while `slide-ng dev` runs.

<!--
Notes appear on the presenter page.
-->
```
