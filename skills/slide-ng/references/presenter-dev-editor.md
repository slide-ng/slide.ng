---
name: presenter-dev-editor
description: Dev-only tools - side editor, write-back, drawings files
---

# Dev server extras

While `slide-ng dev` runs (a static build has none of this and makes no requests):

- The **edit** button in the bar opens a side editor with the current slide's markdown (a textarea over Shiki-coloured markdown), saved as you type. `editor: false` hides it. It picks up outside edits.
- `slide-ng-drag` moves and drawings (`drawings.persist`) are written to files.
- `{monaco-write}` saves into the snippet file.
- Notes: a double click on a note in `/overview` edits it (leaving the text saves). `/notes-edit` has all notes in one text after `--- #N` lines, saved as you type; changing the `--- #N` lines blocks saving. A saved note reloads the page.
- Edits of a slide that was imported from a file outside the deck's folder are refused.
- A companion server writes only to the deck's files, loopback only, with Host and Origin checks.

When an agent edits `slides.md` directly, the dev server reloads by itself; no need to use the side editor.
