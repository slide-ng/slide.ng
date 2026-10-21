---
name: code-monaco-run
description: Runnable code in an editor with monaco-run
---

# Monaco run

````md
```ts {monaco-run} {autorun:false, showOutputAt:'+1', height:'auto'}
console.log('runs on a click and the result appears');
```
````

- An editor and a **Run** result below it. `autorun` is `true`, `false` or `'once'`; `showOutputAt:'+1'` shows the output after a click, counted in document order with the slide's other clicks.
- The code runs in a sandboxed frame with no access to the slides, and stops after 5 seconds. Pressing run again, or leaving the slide, stops a run that is still going at once (an endless loop, say), so the next run does not wait for it. Another `{monaco-run}` that runs meanwhile on the same slide still waits for the cut-off. TypeScript is turned into JavaScript for you. `import` is not supported.
- The code runs in strict mode; headmatter `monacoRunUseStrict: false` turns that off.
- Where headmatter `monaco` turns the editors off (`false`, or `build` in `slide-ng dev`, `dev` in a build) the block is plain code and `showOutputAt` adds no click, so later click numbers and notes `[click]` markers shift by one in that mode.
- Another language: `setup/code-runners.ts`, see `setup-code-runners.md`. The runner gets the text only.

<!-- verify -->

````md
---
title: Monaco run
---

# Run it

```ts {monaco-run} {autorun:false, showOutputAt:'+1', height:'auto'}
console.log('runs on a click and the result appears');
```
````
