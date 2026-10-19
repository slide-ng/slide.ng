---
name: code-monaco-write
description: An editor that saves into a snippet file while the dev server runs
---

# Monaco write

Use it on a snippet line: `<<< ./snippets/demo.ts {monaco-write}`.

- The whole file inside the deck's folder is the editor text. While `slide-ng dev` runs, edits are saved into that file about half a second after you stop typing.
- A region, a plain code block or a static build gets a normal editor (the generator warns for the first two).
- Only text-like files inside the deck are writable (a list of extensions; never `setup/`, `layouts/`, `components/`, the deck's `index.html`, `.git/`, `node_modules/`, `package.json`, lock files or hidden files); the generator warns for the others.
- Dev server only; the file name never comes from a request, only from the generated list of targets.

<!-- verify-file: snippets/demo.ts -->

```ts
export const answer = 42;
```

<!-- verify -->

```md
---
title: Monaco write
---

# Editable file

<<< ./snippets/demo.ts {monaco-write}
```
