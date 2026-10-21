---
name: presenter-view
description: Presenter page, notes page, synced windows and laser pointer
---

# Presenter

- `/presenter` (`/presenter/3`) or the presenter button in the bar: current slide, next step preview, notes with click markers, a clicks slider and the timer. The layout button cycles **three** arrangements.
- The audience page (`/3`) in another window or device follows the presenter. `/notes` shows only the notes and follows too.
- Windows of one browser follow each other with no server (BroadcastChannel). Other devices need the dev server (WebSocket), see `presenter-remote.md`.
- The sync button in the bar (up and down arrows, before the settings) sets how this window takes part: Bidirectional Sync, Receive Only, Send Only or Disable. The choice is kept per role (viewer or presenter) in the browser. It is there whenever the deck has a presenter. In the menu the arrow keys move between the modes (not through the slides); Escape closes it.
- The presenter's mouse is shown to the audience as a pointer or a red laser dot (settings menu or the bar button).
- `presenter: false` has no presenter page, button or menu entry; `dev` / `build` limit it, see `presenter-switches.md`.
- Screen Mirror: the presenter page can show a shared window instead of the slide.
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
