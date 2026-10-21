---
title: Print deck
colorSchema: auto
exportFilename: print-deck
---

# Cover

First slide

<!-- note one -->

---

# Clicks

<div id="c1" slide-ng-click.up>one</div>
<div id="c2" slide-ng-click.none>two</div>

<slide-ng-render-when context="print"><p id="only-print">printing</p></slide-ng-render-when>
<slide-ng-render-when context="slide"><p id="only-slide">on screen</p></slide-ng-render-when>

<slide-ng-video id="pv" poster="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=" printPoster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="></slide-ng-video>

<!-- note two [click] with a click -->

---
level: 2
---

# A flowchart

```mermaid
graph TD
  A-->B
```

---

# Moving code

````md magic-move
```ts
const a = 1
```
```ts
const a = 2
```
````

---
clicksStart: 1
clickAnimation: scale
---

# Starts at one

<div id="s2" slide-ng-click="2">after two</div>

---

# Editor

```ts {monaco}
const answer = 42
```

---

# Marks

<span id="mk" slide-ng-mark.red.circle="1">circled</span>

---

# The end

Done. [Back to the clicks](2), or [a web page](https://example.org). [A page of the site](/nope) and <a href="/handout.pdf">a file</a> are
no links in a PDF.

<slide-ng-render-when context="visible"><p id="print-visible">on paper</p><p fallback id="print-visible-fallback">not seen</p></slide-ng-render-when>
