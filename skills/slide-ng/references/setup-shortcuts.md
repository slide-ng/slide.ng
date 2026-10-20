---
name: setup-shortcuts
description: setup/shortcuts.ts - change the keyboard shortcuts
---

# setup/shortcuts.ts

Gets the actions and the list so far, returns the list to use. A shortcut is `{ name, key, run, when? }`. `key` is a `KeyboardEvent.key` name, with `shift+` in front if needed, and `space` for the space bar. Roots are chained: each gets the list the one before returned. When two shortcuts have the same key, the one later in the list wins, so appending one replaces a built-in key or an earlier root's.

- Not Slidev's `{ key, fn, autoRepeat }` shape.
- Default names: `next_space`, `prev_space`, `next_right`, `prev_left`, `next_page_key`, `prev_page_key`, `next_down`, `prev_up`, `next_shift`, `prev_shift`, `toggle_dark`, `toggle_overview`, `toggle_overview_backtick`, `hide_overview`, `goto`, `fullscreen`, `toggle_click_preview` (presenter page), and overview keys.
- Actions: `next`, `prev`, `nextSlide`, `prevSlide`, `toggleDark`, `toggleOverview`, `toggleGoto`, `toggleFullscreen`, `closeAll`, `toggleDrawing`, `toggleClickPreview`.

<!-- verify-file: setup/shortcuts.ts -->

```ts
import type { Shortcut, ShortcutActions } from 'slide-ng/lib/shortcuts';

export default (actions: ShortcutActions, list: Shortcut[]): Shortcut[] => [
  ...list.filter((s) => s.name !== 'fullscreen'),
  { name: 'dark', key: 'x', run: actions.toggleDark },
];
```

<!-- verify -->

```md
---
title: Shortcuts
---

# Press x for dark mode
```
