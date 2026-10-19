---
name: ui-shortcuts
description: Keys, mouse, the navigation bar, overview, dark mode and URL state
---

# Keys and interface

| key                          | action                                             |
| ---------------------------- | -------------------------------------------------- |
| right, space, page down      | next click, or next slide                          |
| left, shift + space, page up | previous click, or previous slide                  |
| down, shift + right          | next slide (skips the clicks)                      |
| up, shift + left             | previous slide                                     |
| `f`                          | fullscreen                                         |
| `o` or backtick              | overview (arrows move, Enter opens, Escape closes) |
| `d`                          | dark / light                                       |
| `g`                          | go to a slide: number or part of a title, Enter    |
| Escape                       | close overview, dialogs, menus                     |

- Shortcuts are off while typing in an editor and while drawing.
- The bar at the bottom left shows when the mouse is there: fullscreen, previous, next, overview, drawing, presenter mode, info, settings, counter. Right click opens the same actions as a menu (Shift + right click for the browser's menu). Click the dark area beside the slide: right half next, left half previous.
- **The URL is the state**: `/7?clicks=2` is slide 7 at click 2; `/intro` opens a `routeAlias`; `/99` shows the last slide; an address with no slide shows the `404` layout. Hash mode (`routerMode: hash`) gives `/#/7`.
- Dark mode follows the system until the user presses `d` (kept in `localStorage`, key `slidev-color-schema`). `colorSchema: light` or `dark` fixes it.
- Touch: swipe left/right for click steps, up/down for slides (not while drawing). No pinch zoom.
- Change the keys with `setup/shortcuts.ts`, see `setup-shortcuts.md`. Change the right-click menu with `setup/context-menu.ts`, see `setup-context-menu.md`.
- Settings menu (as in Slidev): Invert, Brightness, Contrast, Saturation, Sepia, Hue Rotate (slider and number box), Cursor Style (Cursor or Laser, the laser also works on the main page), Slide Scale, Wake Lock, Hide Idle Cursor; below a divider camera and PDF. "Download as PDF" is only live with `download` and a built PDF, see `build-pdf-download.md`.
- Info dialog shows the headmatter `info` markdown.

The deck, `/presenter/<n>` and `/notes` are described in `presenter-view.md`.
