---
name: setup-code-runners
description: setup/code-runners.ts - run other languages in monaco-run
---

# setup/code-runners.ts

Returns a map from the editor's language id to a function. `{monaco-run}` editors of that language run the function instead of the built-in JavaScript runner. The function gets the editor's **text only** (no context) and returns `{ lines: string[][], error?: string }` or a promise of it; each inner list is one output line.

<!-- verify-file: setup/code-runners.ts -->

```ts
export default () => ({
  python: async (code: string) => ({ lines: [[`got ${code.length} characters`]] }),
});
```

<!-- verify -->

````md
---
title: Code runners
---

# Python editor

```python {monaco-run}
print("hello")
```
````
