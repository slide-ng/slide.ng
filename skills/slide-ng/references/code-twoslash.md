---
name: code-twoslash
description: Type popups on hover with twoslash
---

# Twoslash

Add `twoslash` after the language. Types are worked out while generating (TypeScript does not reach the browser); hover the code to see them.

````md
```ts twoslash
const count = Math.max(1, 2);
//    ^?
```
````

- `//    ^?` shows the type of the word above the `^`, on a line of its own under that code line (it does not cover the code).
- A TypeScript error is shown under its line (`// @errors: <code>` marks it as expected); the types still work. A listed code that never happens gets a warning; an unlisted error is shown, not checked.
- Headmatter `twoslash`: `true` (default), `false`, `dev` or `build` (Twoslash runs only in that mode; a build and an export count as `build`).

<!-- verify -->

````md
---
title: Twoslash
---

# Types on hover

```ts twoslash
const count = Math.max(1, 2);
//    ^?
```
````
