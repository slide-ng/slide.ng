# Command line

`slide-ng [command] [slides.md] [flags]`. Without a command it runs `dev`. Without a file it uses `slides.md` in the current folder.
Flags take `--name value` or `--name=value`; a boolean flag also takes `--no-name`. An unknown flag is an error, so a typo is never ignored.
`slide-ng --version` prints the version, `slide-ng --help` the list of commands, `slide-ng <command> --help` that command's flags.

## dev (default)

Starts the dev server: the deck at `http://localhost:4230`, the presenter at `/presenter`, live reload on every save.

| flag                  | what it does                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--port`, `-p`        | port (default 4230)                                                                                                                                     |
| `--open`, `-o`        | open the browser                                                                                                                                        |
| `--remote[=password]` | listen on every address, for a phone or a second computer. Always with a password: the given one, `SLIDE_NG_PASSWORD`, or a random one that is printed. |
| `--bind`              | the address to listen on with `--remote` (default `0.0.0.0`)                                                                                            |
| `--log`               | `error`, `warn`, `info` (default) or `silent`                                                                                                           |
| `--force`, `-f`       | clear the Angular build cache first                                                                                                                     |
| `--theme`, `-t`       | use this theme (a name or a folder) instead of the headmatter's                                                                                         |

`--tunnel` and `--base` are refused with a message (`--base` is for `build`).

## build

Makes a static site in `dist/`. Hosting is described in [HOSTING.md](HOSTING.md), the offline folder in [OFFLINE.md](OFFLINE.md).

| flag                | what it does                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `--out`, `-o`       | output folder (default `dist`)                                                              |
| `--base`            | the path the site is served from, such as `/talk/` (default `/`)                            |
| `--offline`         | a folder that opens from disk (`file://`), with no server; cannot be combined with `--base` |
| `--download`        | also export a PDF and offer it in the bar (like headmatter `download: true`)                |
| `--without-notes`   | leave the speaker notes out of the site                                                     |
| `--theme`, `-t`     | use this theme instead of the headmatter's                                                  |
| `--executable-path` | the Chromium to use for the PDF and the Open Graph picture (or `CHROME_PATH`)               |
| `--no-sandbox`      | run that Chromium without its sandbox (root or containers, trusted decks only)              |
| `--allow-local`     | let that page reach loopback and private addresses                                          |
| `--timeout`         | milliseconds for each page Chromium renders                                                 |

## export

Makes a PDF (default), PNG files, a PPTX or a Markdown file. It builds the deck first, unless `--dist` or `--url` says where it is.

| flag                                                 | what it does                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--format`                                           | `pdf`, `png`, `pptx` or `md`                                                               |
| `--output`, `-o`                                     | the file (or the folder for PNG); the default comes from `exportFilename` or the file name |
| `--range`                                            | slides to export, such as `1,4-5`                                                          |
| `--with-clicks`, `-c`                                | one page per click step                                                                    |
| `--dark`                                             | dark mode                                                                                  |
| `--per-slide`                                        | PDF: render slide by slide (slower, for very large decks)                                  |
| `--with-toc`                                         | PDF: an outline from the slide titles                                                      |
| `--scale`                                            | PNG and PPTX picture scale, 0.25 to 8 (default 2)                                          |
| `--omit-background`                                  | PNG: a transparent background                                                              |
| `--timeout`, `--wait`, `--wait-until`                | how long to wait for each page (ms), extra wait (ms), and the load state to wait for       |
| `--dist`                                             | export an existing build instead of building                                               |
| `--url`                                              | export a running server (such as the dev server)                                           |
| `--base`                                             | the base the build at `--dist` was made with                                               |
| `--theme`, `-t`                                      | use this theme instead of the headmatter's                                                 |
| `--executable-path`, `--no-sandbox`, `--allow-local` | as for `build`                                                                             |

The headmatter's `export:` block sets the same options (`withClicks`, `perSlide`, ...); the command line wins. `output`,
`executablePath`, `--no-sandbox` and `--allow-local` are never read from a deck. As root or in a container, Chromium needs
`--no-sandbox` (or `SLIDE_NG_NO_SANDBOX=1`).

## export-notes

Makes a PDF of the speaker notes. Takes `--output`, `--range` and the Chromium flags of `export`.

## format

Tidies `slides.md` in place with the same parser that reads it: blank lines around each slide's content, the frontmatter printed again as
clean YAML (comments are kept), and the speaker note at the end. Files that `src:` imports are not touched; give them as arguments to format them too.
It prints `already formatted` when there is nothing to do.

## theme eject

`slide-ng theme eject [slides.md] [--dir theme] [--theme name]` copies the theme in use into a folder of the deck (`./theme` by default)
and sets `theme: ./theme`, so it can be edited. See [THEMES.md](THEMES.md).

## create

`slide-ng create <dir> [--force]` starts a new deck in `<dir>`: `slides.md`, `package.json` (scripts `dev`, `build`, `export`, `format`), a README and `.gitignore`. It refuses a folder with files; `--force` only adds the missing files (and fills in the name only in the files it adds). The `.gitignore` leaves out what `export` and `export-notes` write by default (`slides-export.pdf`, `*-export.*`, `*-notes.pdf`). A mistyped command or flag gets the nearest real one (`Unknown command "biuld". Did you mean "build"?`).

## mcp

`slide-ng mcp [slides.md]` starts the MCP server on stdio, so an agent can list, read and edit slides. See [ARCHITECTURE.md](ARCHITECTURE.md).

## skills install

`slide-ng skills install [--dir <folder>] [--force]` copies the agent skill into the project (`.agents/skills/slide-ng` by default).
See [AGENT-SKILL.md](AGENT-SKILL.md).

## Environment

| variable              | what it does                                                   |
| --------------------- | -------------------------------------------------------------- |
| `CHROME_PATH`         | the Chromium for export, `build --download` and the OG picture |
| `SLIDE_NG_NO_SANDBOX` | `1` is the same as `--no-sandbox`                              |
| `SLIDE_NG_PASSWORD`   | the password for `dev --remote`                                |
| `SLIDE_NG_THEME`      | the same as `--theme`                                          |
