---
name: presenter-timer
description: Talk duration and the timer on the presenter page
---

# Timer

```yaml
duration: 30min # 30min, 1h30min, 90s, or a number of minutes
timer: countdown # or stopwatch (default)
```

- The time is shared by every window and device (also with clocks set differently). A reloaded presenter tab keeps it; a reopened one gets it from another open window, or from the dev server.

<!-- verify -->

```md
---
title: Timer
duration: 1h30min
timer: stopwatch
---

# A long talk
```
