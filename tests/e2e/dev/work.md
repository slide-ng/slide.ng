---
title: Dev write test
drawings:
  persist: true
record: false
---

# One

First slide.

---
dragPos:
  named: 300,200,100,100
---

# Two

<div id="b1" slide-ng-drag="[100,100,160,60]" style="background:#fca5a5">Box</div>
<div id="b2" slide-ng-drag="named" style="background:#93c5fd">Named</div>
<div id="b3" slide-ng-drag style="width:90px;background:#fde68a">Bare</div>

---

# Three

<<< ./work-snippet.ts {monaco-write}
