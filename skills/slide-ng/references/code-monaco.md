---
name: code-monaco
description: Monaco editors and diff editors in slides
---

# Monaco

An editor in the slide, loaded only when a deck has one, no network needed.

````md
```ts {monaco}
const message: string = 'edit me';
```

```ts {monaco-diff}
console.log('Original text');
~~~
console.log('Modified text');
```
````

- `{monaco}`: an editor with the code. Options (flat, after the braces): `lines`, `readonly`, `height` (`initial`, `auto` or a CSS size).
- `{monaco-diff}`: two texts side by side, split by a line that holds only `~~~`.
- Keys typed in an editor do not trigger slide shortcuts.
- Headmatter `monaco`: `true` (default), `false`, `dev` or `build`. Off for the current mode, the editor blocks are plain highlighted code.
- Settings: `setup/monaco.ts`, see `setup-monaco.md`. Monaco does not load types of packages (`monacoTypesSource` is missing).
- Running code: `code-monaco-run.md`. Saving to a file: `code-monaco-write.md`.

<!-- verify -->

````md
---
title: Monaco
---

# Editor

```ts {monaco}
const message: string = 'edit me';
```

---

# Diff

```ts {monaco-diff}
console.log('Original text');
~~~
console.log('Modified text');
```
````
