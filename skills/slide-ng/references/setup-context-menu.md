---
name: setup-context-menu
description: setup/context-menu.ts - change the right-click menu
---

# setup/context-menu.ts

Gets the entries of the right-click menu and returns the list to show. An entry is `{ icon, label, run, disabled? }`; `icon` is an icon class such as `i-carbon:star`. Roots are chained. Built-in labels follow the deck's `lang`, so match an entry by `icon`. The `contextMenu` headmatter key (`true`, `false`, `dev`, `build`) switches the menu.

<!-- verify-file: setup/context-menu.ts -->

```ts
import type { ContextMenuItem } from 'slide-ng/setup';

export default (items: ContextMenuItem[]): ContextMenuItem[] => [
  ...items,
  { icon: 'i-carbon:link', label: 'Open the notes', run: () => window.open('/notes') },
];
```

<!-- verify -->

```md
---
title: Context menu
---

# Right click me
```
