---
name: setup-monaco
description: setup/monaco.ts - editor options and Monaco configuration
---

# setup/monaco.ts

Runs once Monaco is loaded (only for decks with an editor). Gets the `monaco` module (add themes, languages; `monaco.languages.typescript` is deprecated and untyped in this Monaco version). The object it returns is merged into the options of every editor. May be async.

- `theme` is one name for light and dark mode alike, or `{ light, dark }` to follow the deck's mode (the default is `vs` and `vs-dark`).
- No type loading for packages (`monacoTypesSource` and friends are missing).

<!-- verify-file: setup/monaco.ts -->

```ts
import type * as Monaco from 'monaco-editor';

export default (monaco: typeof Monaco) => {
  monaco.editor.defineTheme('mine-light', { base: 'vs', inherit: true, rules: [], colors: {} });
  monaco.editor.defineTheme('mine-dark', { base: 'vs-dark', inherit: true, rules: [], colors: {} });
  return { fontSize: 14, minimap: { enabled: true }, theme: { light: 'mine-light', dark: 'mine-dark' } };
};
```

<!-- verify -->

````md
---
title: Monaco setup
---

# Editor

```ts {monaco}
const a = 1;
```
````
