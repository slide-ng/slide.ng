---
title: Phase 3 deck
duration: 10min
timer: countdown
drawings:
  persist: true
record: true
wakeLock: true
download: true
---

# Phase 3

First slide, no clicks.

<!--
Notes of slide one.
-->

---

# Clicks and notes

<div slide-ng-click id="c1">One</div>
<div slide-ng-click id="c2">Two</div>

<!--
Before the clicks.
[click] Shown after the first click.
[click] Shown after the second click.
-->

---

# Third

Plain slide.

---
dragPos:
  square: 600,300,100,100
---

# Fourth

Last slide.

<div id="d1" slide-ng-drag="[100,200,160,60]" style="background:#fca5a5">Box</div>
<div id="d2" slide-ng-drag="square" style="background:#93c5fd">Named</div>
<slide-ng-drag id="d3" pos="500,100,150,_" style="background:#86efac">Component</slide-ng-drag>
<slide-ng-drag-arrow id="d4" pos="300,250,120,80" />
<div id="d5" slide-ng-drag style="background:#fde68a;width:100px">Bare</div>
