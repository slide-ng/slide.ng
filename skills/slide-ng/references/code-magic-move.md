---
name: code-magic-move
description: Animate code between steps with Shiki Magic Move
---

# Magic Move

Several code steps in one block, moving between them with a click each (`@shikijs/magic-move`, loaded only when a deck uses it). Use a fence with **four** backticks and `magic-move` after the language `md`, holding normal fences:

`````md
````md magic-move {lines: true}
```js {*|1|2-3}
let count = 1;
function add() {
  count++;
}
```

```ts
let count: number = 1;
const add = () => (count += 1);
```
````
`````

- Each inner fence is one step; ranges inside a step add clicks of their own (`{*|1|2-3}` is three steps).
- Options after `magic-move`: `lines`, `at` (first click), `duration` (ms; headmatter `magicMoveDuration` sets it for the deck). A `[title]` before the options gives a title bar.
- Headmatter `magicMoveCopy: false` hides the copy button.
- Headmatter `shiki.magicMove` sets the animation: `duration`, `stagger` (ms, default 1), `delayMove`, `delayLeave`, `delayEnter`, `delayContainer`, `easing`, `animateContainer`, `containerStyle`, `splitTokens`, `enhanceMatching`. A block's `{duration}` wins, then `magicMoveDuration`, then `shiki.magicMove.duration`.

<!-- verify -->

`````md
---
title: Magic move
magicMoveDuration: 600
shiki:
  magicMove:
    stagger: 3
    easing: ease-in-out
---

# Steps

````md magic-move {lines: true}
```js {*|1|2-3}
let count = 1;
function add() {
  count++;
}
```

```ts
let count: number = 1;
const add = () => (count += 1);
```
````
`````
