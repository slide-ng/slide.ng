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
| `g`                          | go to a slide: number or part of a title, Enter                                |
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

- Screen readers hear each new slide's number and title; elements that wait for a click are hidden until shown. Presenter page: regions Current slide, Next step, Notes; the next-step picture and line numbers are skipped.
- `prefers-reduced-motion: reduce`: transitions, click fades, `slide-ng-motion` and Magic Move happen at once (CSS durations cut to ~0). JS timers in own components are not changed.
- Forced colors (Windows high contrast): the interface icons use the text colour; own icon colours are not kept.
- Alt text: `![text](/a.png)` or `<img alt>`. `image:` / `background:` in the frontmatter are CSS backgrounds and cannot have alt text: add an `<img alt>` or say it in the text.
- Mermaid: `accTitle:` and `accDescr:` lines become the SVG's title and description.
- Math is read as its TeX source (no MathML); say important formulas in words.
