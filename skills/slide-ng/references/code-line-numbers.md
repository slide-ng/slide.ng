---
name: code-line-numbers
description: Line numbers and the first line number
---

# Line numbers

- Per block: `{lines:true}`; first number: `{startLine:5}`.
- For every block: `lineNumbers: true` in the headmatter.
- Options go in the second brace, after any ranges: `{6,7} {lines:true, startLine:5}`. Ranges use the numbers shown: with `startLine:5` the first line is 5.

<!-- verify -->

````md
---
title: Line numbers
---

# Numbered

```ts {lines:true, startLine:5}
const a = 1;
const b = 2;
```

```ts {2} {lines:true}
const a = 1;
const b = 2;
```
````
