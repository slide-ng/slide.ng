---
name: mcp-server
description: slide-ng mcp over stdio, and /__mcp over HTTP from the dev server - read and edit slides, move the presentation
---

# MCP server

```sh
slide-ng mcp [slides.md]
```

An MCP server on stdio for a tool client. It touches only the deck's markdown files. stdout carries the protocol; the start message `slide-ng mcp: serving <path>` goes to stderr.

Client configuration (the shape depends on the client):

```json
{ "mcpServers": { "slide-ng": { "command": "slide-ng", "args": ["mcp", "slides.md"] } } }
```

- Path confinement: a slide that lives in a file outside the deck's folder is refused.
- Slide 1 (it carries the headmatter) cannot be removed or moved; insert, remove and move need all slides to be in the entry file.
- Every edit is checked: the other slides must look the same afterwards, and the file is only written if the result parses as expected.
- Tool list and arguments: `mcp-tools.md`.
- A coding agent that can edit files directly may edit `slides.md` itself; the server is for clients that cannot.

## Over HTTP from the dev server

While `slide-ng dev` runs, the same tools are served at `http://localhost:4230/__mcp` (streamable HTTP, POST only), plus `get_info` and `goto_slide`:

```json
{ "mcpServers": { "slide-ng": { "type": "http", "url": "http://localhost:4230/__mcp" } } }
```

- With `--remote` the client sends `Authorization: Bearer <password>` (spaces inside it included, spaces at its start or end ignored); a page from another site is refused (Origin check).
- `mcp: false` in the headmatter turns it off (404).
- `slide-ng mcp` (stdio) has no `get_info` or `goto_slide`: they need the running presentation.
