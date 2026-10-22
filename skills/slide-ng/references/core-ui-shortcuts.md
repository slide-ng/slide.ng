---
name: ui-shortcuts
description: Keys, mouse, the navigation bar, overview, dark mode and URL state
---

# Keys and interface

| key                          | action                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------ |
| right, space, page down      | next click, or next slide                                                      |
| left, shift + space, page up | previous click, or previous slide                                              |
| down, shift + right          | next slide (skips the clicks)                                                  |
| up, shift + left             | previous slide                                                                 |
| `f`                          | fullscreen                                                                     |
| `o` or backtick              | overview (arrows move, Enter opens, Escape closes; a button opens `/overview`) |
| `d`                          | dark / light                                                                   |
| `g`                          | go to a slide: number or part of a title (any case, accents optional), Enter   |
| Escape                       | close overview, dialogs, menus                                                 |
| `u`                          | presenter page: show or hide the upcoming clicks                               |

- Shortcuts are off while typing in an editor and while drawing.
- The bar at the bottom left shows when the mouse is there: fullscreen, previous, next, overview, dark mode, drawing, presenter mode, info, settings, counter. Right click opens the same actions as a menu (Shift + right click for the browser's menu). Click the dark area beside the slide: right half next, left half previous.
- **The URL is the state**: `/7?clicks=2` is slide 7 at click 2; `/intro` opens a `routeAlias`; `/99` shows the last slide; an address with no slide shows the `404` layout. Hash mode (`routerMode: hash`) gives `/#/7`.
- Dark mode follows the system until the user toggles it (kept in `localStorage`, key `slidev-color-schema`). `colorSchema: light` or `dark` fixes it and hides the button.
- Touch (audience page only, not presenter or `/notes`): swipe left/right for click steps, up/down for slides (not while drawing, not when the finger starts on a `slide-ng-drag` element or handle). No pinch zoom. The first tap on the hidden bar only shows it.
- Change the keys with `setup/shortcuts.ts`, see `setup-shortcuts.md`. Change the right-click menu with `setup/context-menu.ts`, see `setup-context-menu.md`.
- Settings menu (as in Slidev): Invert, Brightness, Contrast, Saturation, Sepia, Hue Rotate (slider and number box), Cursor Style (Cursor or Laser, the laser also works on the main page), Slide Scale, Wake Lock, Hide Idle Cursor; below a divider dark mode (only with `colorSchema: auto`), camera and PDF. "Download as PDF" is only live with `download` and a built PDF, see `build-pdf-download.md`.
- Info dialog shows the headmatter `info` markdown.

The deck, `/presenter/<n>` and `/notes` are described in `presenter-view.md`.

## Accessibility

- Screen readers hear each new slide's number and title (plain text: markdown marks dropped, `$math$` as its TeX with one-character escapes undone, `$400\%$` is "400%"; also the tab title, goto list and PDF outline); math is read as its TeX in the slide, in `<slide-ng-title-renderer>` and in the table of contents; elements that wait for a click are hidden until shown. Presenter page: regions Current slide, Next step, Notes; the next-step picture and line numbers are skipped.
- Landmarks: the slide is in the main landmark; the presenter, `/overview` and `/notes` have a main landmark and an h1 (visually hidden on the presenter and `/notes`); `/entry` and `/presenter/print` have a main landmark. The quick overview, the right-click menu and the goto box are named dialogs with all their controls inside.
- Keyboard: arrows in the quick overview move the focus between cards named "Go to slide N: title"; in the click preview the badges are the keyboard path (a greyed-out part's links are inert); Escape in Edit Notes returns focus to its button, Escape in the settings menu (number fields too) to the settings button, Escape in the drawing toolbar to the pen button (which has `aria-expanded`); `/overview` notes are named groups that say they are editable (Enter edits).
- Right-click menu by keyboard: Shift+F10 or the menu key opens it on its first item; arrows, Home, End and Tab move in it (not through the slides), Escape closes it and returns the focus. While it is open the deck's keys do nothing.
- Presenter notes pane borders (separators with `aria-valuenow`) are Tab stops: arrows move them 16 px (Shift: 64), Home/End give the notes their smallest/biggest size.
- The goto box takes Arabic-Indic and Persian digits (`٣`, `۳`) for slide numbers.
- The `progressBar` is a named `progressbar` (`progress.label`) and is filled with the highlight colour in forced colors.
- Interface text meets 4.5:1 (large 3:1) in light and dark, faded notes of later clicks included (opacity 0.75, once: not again inside a faded paragraph) and the "No notes." placeholder; icon buttons are at least 24x24 px, click preview badges and the timer's pause/reset buttons (side by side) included; the settings and sync menus and the info dialog fit and scroll down to 320x180 (400% zoom).
- `prefers-reduced-motion: reduce`: transitions, click fades, `slide-ng-motion` and Magic Move happen at once (CSS durations cut to ~0). JS timers in own components are not changed.
- Forced colors (Windows high contrast): the interface icons use the text colour and progress bars the highlight colour; own icon colours are not kept.
- Alt text: `![text](/a.png)` or `<img alt>`. `image:` / `background:` in the frontmatter are CSS backgrounds and cannot have alt text: add an `<img alt>` or say it in the text.
- Mermaid: `accTitle:` and `accDescr:` lines become the SVG's title and description.
- Math is read as its TeX source (no MathML); say important formulas in words.
