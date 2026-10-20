---
name: presenter-switches
description: Headmatter switches for presenter, editor, record, contextMenu, wakeLock
---

# Switches

| key           | values                          | meaning                                   |
| ------------- | ------------------------------- | ----------------------------------------- |
| `presenter`   | `true`, `false`, `dev`, `build` | presenter page, button and menu entry     |
| `editor`      | `false` hides the side editor   | dev only                                  |
| `record`      | `true`, `false`, `dev`, `build` | camera and record buttons (default `dev`) |
| `contextMenu` | `true`, `false`, `dev`, `build` | right-click menu                          |
| `wakeLock`    | `true`, `false`, `dev`, `build` | screen kept awake (default `true`)        |
| `drawings`    | object                          | see `animation-drawing.md`                |
| `colorSchema` | `auto`, `light`, `dark`         | see `core-headmatter.md`                  |

The wake lock is also a settings menu entry; a choice already stored in the browser wins over `wakeLock: true`.

<!-- verify -->

```md
---
title: Switches
presenter: true
editor: false
record: dev
contextMenu: true
wakeLock: false
---

# Switches
```
