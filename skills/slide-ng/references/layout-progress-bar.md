---
name: progress-bar
description: A progress bar on every slide (progressBar) or placed by hand (<slide-ng-progress-bar>)
---

# Progress bar

`progressBar` in the headmatter draws a thin bar along the edge of every slide: empty on the first slide, full on the last. The clicks of a slide fill part of the way to the next one (not on the last slide). It shows on the audience page, the presenter's slide and next step, and in print and export.

| option     | default                    | meaning                                                                        |
| ---------- | -------------------------- | ------------------------------------------------------------------------------ |
| `position` | `bottom`                   | `top` or `bottom` edge of the slide                                            |
| `height`   | `4`                        | thickness in slide pixels                                                      |
| `color`    | the theme's primary colour | any CSS colour                                                                 |
| `track`    | `transparent`              | colour of the empty part                                                       |
| `clicks`   | `true`                     | `false` counts whole slides only                                               |
| `minutes`  | `false`                    | while the presenter timer runs: minutes left (countdown) or passed (stopwatch) |

`progressBar: true` uses the defaults.

<!-- verify -->

```md
---
title: Progress
duration: 20min
timer: countdown
progressBar:
  position: top
  height: 6
  color: '#e11d48'
  minutes: true
---

# One

---

# Two

<slide-ng-progress-bar position="inline" height="10" color="green" track="#ddd" clicks="false" />
```

- `<slide-ng-progress-bar />` takes the same options as attributes; `position="inline"` keeps it where it is written instead of on an edge. It also works in a layer (`layers/global-bottom.ts`): import `SlideProgressBar` from `slide-ng/builtin/progress-bar` and add it to the component's `imports`, since a layer is a plain Angular component.
- Not in Slidev (its bar is on the presenter page only); do not look for a Slidev equivalent.
