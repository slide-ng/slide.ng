---
name: presenter-view
description: Presenter page, notes page, synced windows and laser pointer
---

# Presenter

- `/presenter` (`/presenter/3`) or the presenter button in the bar: current slide, next step preview, notes with click markers, a clicks slider and the timer. The layout button cycles **three** arrangements.
- The audience page (`/3`) in another window or device follows the presenter. `/notes` shows only the notes and follows too.
- An audience page opened (or reloaded) while a presenter page is open goes to the presenter's slide and click, whatever its address says (`/3` shows the presenter's slide 7), as in Slidev, once that presenter has moved: a presenter page that only opened takes along an audience page at slide 1, not one at another slide. Disable in its sync menu lets it look around on its own.
- Windows of one browser follow each other with no server (BroadcastChannel). Other devices need the dev server (WebSocket), see `presenter-remote.md`.
- The sync button in the bar (up and down arrows, before the settings) sets how this window takes part: Bidirectional Sync, Receive Only, Send Only or Disable. The choice is kept per role (viewer or presenter) in the browser. It is there whenever the deck has a presenter. A viewer on another device only follows: Bidirectional Sync and Send Only are disabled there. Opening the menu focuses the ticked mode; the arrow keys then move between the modes (not through the slides; in a right-to-left deck ArrowLeft is the next mode); Escape closes it and focuses the sync button again.
- A deck with `languages` has a language button in the bar; a switch reloads every window of the deck in that browser (presenter and audience) in the new language, at the same slide. Another device keeps its own language.
- Drag the borders of the notes pane to resize it; each layout keeps its own sizes.
- In dev, the pencil next to the notes' font buttons (**Edit Notes**) turns the notes into a text box that saves only the note into the markdown; Escape or a click outside ends it. The bar's editor button shows the side editor in the notes pane.
- The presenter's mouse is shown to the audience as a pointer or a red laser dot (settings menu or the bar button).
- `presenter: false` has no presenter page, button or menu entry; `dev` / `build` limit it, see `presenter-switches.md`.
- Screen Mirror: the presenter page can show a shared window instead of the slide.
- Click preview (slide.ng's own, not Slidev): the eye button in the presenter's bar or `u` draws the whole current slide on the presenter page. Parts of later clicks are greyed out, the next click's part is brighter with a dashed outline, each has a badge with its click number; clicking a badge or a greyed-out part goes to that click in every window (a link inside a greyed-out part is not followed; while drawing the pen gets the click). The audience is unchanged. A switch shows only its current child; code steps, magic-move, marks and motion stay at the current click with a badge. Parts with a click animation preset or a hidden `transform` (`.slidev-vclick-hidden { transform: scale(0) }`) are drawn in place (a ghost's own `transform`/`translate`/`scale`/`rotate` is reset until its click, and a ghost keeps the ghost opacity whatever the preset); a fractional click's badge is the whole click it shows at; badges sit at the inline start (right in RTL). Content in `@if (clicks.current() > n)` is not previewed (it is not on the page yet): use `slide-ng-click` for it. Screen readers skip the greyed-out parts and their content is inert (no Tab stops); the badges are the keyboard path, "Go to click N" buttons of 24x24 screen px; after Enter on one the focus moves to the next badge. A part that its click hides (`slide-ng-click-hide`) has a struck-through badge named "Go to click N, where this part goes away" and, as the next click, a dotted outline (`slide-ng-click-hides`). Theme variables: `--slide-ng-ghost-opacity` (0.47, dark 0.4), `--slide-ng-ghost-next-opacity`, `--slide-ng-ghost-next` (default: the theme's primary colour), `--slide-ng-ghost-badge-background`, `--slide-ng-ghost-badge-foreground`. Not in the notes PDF.
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
