---
name: cli
description: The slide-ng command, its subcommands, flags and how to check that each one worked
---

# Command line

`slide-ng [command] [slides.md] [flags]`. With no command (or a `.md` file or a flag first) it starts the dev server. A deck is one markdown file, `slides.md` by default. If `slide-ng` is not on the PATH, run `node <slide.ng checkout>/bin/slide-ng.mjs ...` or use the `npm run` scripts of the deck.

| command                    | what it does                                                                                                                                                                        | check that it worked                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `slide-ng create my-deck`  | new folder with `slides.md`, `package.json` (scripts `dev`, `build`, `export`, `format`), `README.md`, `.gitignore`. Refuses a folder with files; `--force` only adds missing files | the output says `Created ...`; `my-deck/slides.md` exists. Then `npm install`  |
| `slide-ng dev [slides.md]` | dev server on **http://localhost:4230** (not 3030) with live reload                                                                                                                 | open `http://localhost:4230/1`; the terminal shows no `[slides]` warning lines |
| `slide-ng build`           | static site in `./dist`; `build a.md b.md` builds each deck into `dist/a/`, `dist/b/` (base `/a/`, `/b/`); nothing else is kept in `dist`                                           | last line is `Built N slides into ...`; `dist/index.html` exists               |
| `slide-ng build --offline` | folder that opens from disk                                                                                                                                                         | `Offline folder: one classic script ...` is printed                            |
| `slide-ng export`          | PDF (default), PNG, PPTX or Markdown; needs Chromium. `export a.md b.md` writes one file per deck (no `--output`, `--dist`, `--url` then)                                           | `Exported to <file>` is printed and the file exists                            |
| `slide-ng export-notes`    | PDF of the speaker notes                                                                                                                                                            | `<name>-notes.pdf` exists                                                      |
| `slide-ng format`          | tidies the markdown                                                                                                                                                                 | prints `formatted` or `already formatted`                                      |
| `slide-ng theme eject`     | copies the theme in use into `./theme` and sets `theme: ./theme`                                                                                                                    | `./theme` exists                                                               |
| `slide-ng mcp`             | MCP server on stdio                                                                                                                                                                 | stderr says `slide-ng mcp: serving <path>`                                     |
| `slide-ng skills install`  | copies this agent skill into `.agents/skills/slide-ng`                                                                                                                              | prints `Installed the slide-ng skill in ...`                                   |

## Flags

| command          | flags                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`            | `--port`/`-p` (4230, else the next free port; a taken `--port` stops it), `--open`/`-o`, `--remote[=password]`, `--bind <address>`, `--log error\|warn\|info\|silent`, `--force`/`-f` (clear the build cache), `--theme`/`-t`, `--lang <tag>`                                                                                                               |
| `build`          | `--out`/`-o` (`dist`), `--base /talk/`, `--offline`, `--download`, `--without-notes`, `--router-mode history\|hash\|memory`, `--theme`/`-t`, `--lang <tag>` (one entry file per language: `slide-ng build slides.tr.md --out dist/tr`), `--executable-path`, `--no-sandbox`, `--allow-local`, `--timeout`                                                   |
| `export`         | `--format pdf\|png\|pptx\|md`, `--output`/`-o`, `--range 1,4-5`, `--with-clicks`/`-c`, `--dark`, `--timeout`, `--wait`, `--wait-until`, `--executable-path`, `--no-sandbox`, `--allow-local`, `--per-slide`, `--scale`, `--omit-background`, `--with-toc`, `--theme`/`-t`, `--lang <tag>` (not with `--dist`/`--url`), `--dist <folder>`, `--url <address>` |
| `create`         | `<folder>`, `--force`/`-f`                                                                                                                                                                                                                                                                                                                                  |
| `skills install` | `--dir <folder>` (default `.agents/skills`; the skill goes in `<dir>/slide-ng`), `--force`/`-f`                                                                                                                                                                                                                                                             |

In a terminal, `dev` reads keys: `r` restart, `o` open the browser, `e` open the entry in `$EDITOR` (else `code`), `q` quit, `c` (with `--remote`) a QR code of the private address, password included. A restart does not repeat `--open`. With `--remote` the printed private addresses carry `?password=`; with `routerMode: hash` they are `/#/?password=...` and `/#/presenter/1?password=...` (the QR code too). The prompt trims the typed password, `SLIDE_NG_PASSWORD` and `--remote=...` keep spaces, the browser login compares exactly.

An unknown flag is an error. `--tunnel` and dev `--base` are refused with a message.

## Rules for agents

- Run the dev server in the background and read its output; a `[slides] ...` line is a warning about the deck (unknown layout, unknown code language, missing slot). Fix it.
- After editing `slides.md`, `slide-ng build` is the real check: Angular compiles every slide, so a template mistake fails the build and names the generated slide (`slide-007`; count slides from 1, `---` separates them).
- `export` and `build --download` never download a browser: set `CHROME_PATH` or pass `--executable-path`.
- Chromium keeps its sandbox; as root or in a container add `--no-sandbox` (trusted decks only). The exported page cannot reach private or loopback addresses unless `--allow-local`; neither flag can be set from the headmatter.
- `build` empties its output folder only if it is new, empty or made by an earlier slide.ng build.

<!-- verify -->

```md
---
title: Smoke test
---

# Smoke test

Starts with `slide-ng dev`, builds with `slide-ng build`.
```
