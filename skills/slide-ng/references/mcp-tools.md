---
name: mcp-tools
description: The MCP tools and their arguments (seven, and two more on the dev server)
---

# MCP tools

| tool           | arguments                                          | returns                                                                                                                                              |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_slides`  | none                                               | per slide: `no`, `title`, `layout`, `hasNotes`, `file`                                                                                               |
| `get_outline`  | none                                               | `items` (`no`, `title`, `level`) and an indented `text`                                                                                              |
| `get_slide`    | `no`                                               | the slide's `markdown` exactly as written, `title`, `frontmatter`, `notes`, `file`                                                                   |
| `update_slide` | `no`, `markdown`                                   | replaces one slide (frontmatter, content, notes); it may add or remove the frontmatter; must stay one slide                                          |
| `insert_slide` | `after`, `markdown`, optional `frontmatter` object | adds a slide after slide `after` (never before slide 1); `markdown` may start with its own `---` frontmatter block                                   |
| `remove_slide` | `no`                                               | removes a slide (not slide 1); returns `slides` and the `removed` slide's `no` and `title`                                                           |
| `move_slide`   | `from`, `to`                                       | the slide `from` becomes slide `to` (slide 1 cannot move)                                                                                            |
| `get_info`     | none (dev server only)                             | `entry`, `title`, `slides`, `files`, `url` of the dev server, `current` (`page`, `clicks`) or null                                                   |
| `goto_slide`   | `no`, optional `clicks` (dev server only)          | moves every open window (presenter and audience); returns `no`, the `clicks` the windows took (at most the slide's last) and the number of `windows` |

- Slide numbers start at 1.
- `markdown` has no trailing `---` separator.
- A failed call returns an error text; the server keeps running.
- Edits cannot switch on `allowOutsideRoot` or `fonts.allowCustomProvider`; those are changed by editing the file yourself. `get_slide` reads only files inside the deck folder (or a theme folder) unless the deck sets `allowOutsideRoot: true`.
