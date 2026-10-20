---
name: presenter-dev-editor
description: Dev-only tools - side editor, write-back, drawings files
---

# Dev server extras

While `slide-ng dev` runs (a static build has none of this and makes no requests):

- The **edit** button in the bar opens a side editor with the current slide's markdown (a textarea over Shiki-coloured markdown), saved as you type. `editor: false` hides it. It picks up outside edits. On the presenter page it takes the place of the notes.
- **Edit Notes** on the presenter page edits only the slide's note (the last HTML comment after the slide's frontmatter; a comment inside the frontmatter is not a note).
- `slide-ng-drag` moves and drawings (`drawings.persist`) are written to files.
- `{monaco-write}` saves into the snippet file.
- Edits of a slide that was imported from a file outside the deck's folder are refused.
- A companion server writes only to the deck's files, loopback only, with Host and Origin checks.

When an agent edits `slides.md` directly, the dev server reloads by itself; no need to use the side editor.
