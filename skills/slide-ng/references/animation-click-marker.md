---
name: click-marker
description: Click markers in speaker notes
---

# Click markers in notes

In a slide's note, `[click]` marks where the next click starts and `[click:3]` moves three clicks on from the marker before it (Slidev's counting). The presenter page shows the note in sections; double click a marker to jump the slide to that click.

```md
<!--
Say hello.
[click] Now the first item.
[click:3] Back to the plan.
-->
```

<!-- verify -->

```md
---
title: Click markers
---

# Notes with markers

<div slide-ng-click>first</div>
<div slide-ng-click>second</div>

<!--
Introduce the slide.
[click] Explain the first item.
[click] Explain the second item.
-->
```
