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
- A TypeScript error is shown under its line (`// @errors: <code>` marks it as expected); the types still work.
- The headmatter `twoslash: dev|build` switch is not read.

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
