---
name: export-formats
description: slide-ng export - PDF, PNG, PPTX and Markdown
---

# Export

```sh
slide-ng export                          # PDF, slides-export.pdf (named after the deck / exportFilename)
slide-ng export --format png             # one PNG per slide
slide-ng export --format pptx            # pictures with notes (one slide per click step)
slide-ng export --format md              # markdown with pictures and notes
slide-ng export --range 1,4-5 --with-clicks --dark
slide-ng export --dist dist              # export an existing build (with the router mode it was built with)
slide-ng export --url http://localhost:4230/   # export a running server
```

Verify: the output says `Exported to <file>` and the file exists.

- **Needs Chromium.** It never downloads one: set `CHROME_PATH` or pass `--executable-path`.
- PDF: real text, canvas-sized pages, optional outline from slide titles (`--with-toc`), one page per slide or per click (`--with-clicks`). Without `--with-clicks` a slide with clicks shows its last state. `slide-ng-render-when context="print"` content shows only on paper.
- PPTX: **pictures** only, with notes. Editable PowerPoint shapes (`pptx-editable`) are not made.
- One entry per run (no `export a.md b.md`).
- Lazy content (Mermaid, Monaco, Magic Move, marks) is waited for through `data-slide-ng-waitfor` markers.
- Output file names are sanitised and nothing is written outside the output place.
- The headmatter can hold defaults: `exportFilename`, `export: { ... }`, see `export-options.md`.

<!-- verify -->

```md
---
title: Export
exportFilename: talk
export:
  format: pdf
  withClicks: true
---

# Exported

<div slide-ng-click>step</div>
```
