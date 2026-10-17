---
name: export-options
description: Export flags and the export block in the headmatter
---

# Export options

Command line wins over the headmatter `export:` block, which wins over defaults.

| flag                                                           | headmatter key   | default                                      |
| -------------------------------------------------------------- | ---------------- | -------------------------------------------- |
| `--format`                                                     | `format`         | `pdf` (`png`, `pptx`, `md`)                  |
| `--range 1,4-5`                                                | `range`          | all slides                                   |
| `--with-clicks`, `-c`                                          | `withClicks`     | false (true for pptx)                        |
| `--dark`                                                       | `dark`           | false (true if `colorSchema: dark`)          |
| `--timeout` (ms, 1000-600000)                                  | `timeout`        | 30000                                        |
| `--wait` (ms, 0-120000), also for `@defer (on timer/viewport)` | `wait`           | 0                                            |
| `--wait-until networkidle\|load\|domcontentloaded\|none`       | `waitUntil`      | `networkidle`                                |
| `--per-slide`                                                  | `perSlide`       | false                                        |
| `--scale 0.25-8`                                               | `scale`          | 2                                            |
| `--omit-background`                                            | `omitBackground` | false                                        |
| `--with-toc`                                                   | `withToc`        | false                                        |
| `--output`, `-o`                                               | not allowed      | command line only                            |
| `--executable-path`                                            | not allowed      | command line or `CHROME_PATH` only           |
| `--no-sandbox`                                                 | not allowed      | off; command line or `SLIDE_NG_NO_SANDBOX=1` |
| `--allow-local`                                                | not allowed      | off (private addresses are blocked)          |

`--no-sandbox` (Chromium without its sandbox, for root or containers and trusted decks only) and `--allow-local` (the exported page may reach loopback and private addresses, otherwise blocked) are command line flags only. `output` and `executablePath` are never read from a deck: a deck may come from someone else and must not choose which program runs or where files go.

<!-- verify -->

```md
---
title: Export options
export:
  format: pdf
  range: 1-2
  withClicks: false
  dark: false
  timeout: 60000
  wait: 100
  waitUntil: load
  withToc: true
  perSlide: false
  scale: 2
  omitBackground: false
---

# Export defaults

---

# Second slide
```
