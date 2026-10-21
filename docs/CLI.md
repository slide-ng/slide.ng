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
| `--lang`              | use this language (`tr`, `pt-BR`) instead of the headmatter's `lang`: the interface, the locale of dates and numbers, `<html lang>`                     |

With `--remote` the dev server prints the public slide show, the private one and the presenter for each network address; the
private addresses carry the password (`http://192.168.1.5:4230/?password=...`, `.../presenter/1?password=...`). The page logs in
with it, then takes it out of the address bar. A deck with `routerMode: hash` (in its headmatter, or from its theme or addons) gets addresses after `#/` (`/#/?password=...`,
`/#/presenter/1?password=...`), and the `c` QR code follows the same mode; the page reads the password from the query after the `#`
too. Opened without a password, the page asks once.

Spaces in the password: the terminal prompt trims the typed password; `SLIDE_NG_PASSWORD` and `--remote=...` keep it as written,
leading and trailing spaces included. The browser login compares exactly what is typed or in the address (the printed addresses
encode spaces as `%20`), so a password with spaces at its ends must be typed with them.

`--tunnel` and `--base` are refused with a message (`--base` is for `build`).

On a terminal the dev server also reads keys, as Slidev's does, and prints a line that lists them:

| key | what it does                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `r` | restart the generator, the companion server and the Angular dev server (`--open` opens no new tab); the keys still answer at once afterwards, without Enter |
| `o` | open `http://localhost:<port>/` in the default browser                                                                                                      |
| `e` | open the entry file in `$VISUAL`, `$EDITOR` (flags allowed, such as `code -w`) or else `code`                                                               |
| `q` | quit (Ctrl+C too)                                                                                                                                           |
| `c` | with `--remote`: print a QR code of the private slide show for each address, so a phone can open it                                                         |

The QR code holds the password, like the private address it encodes: do not show it to people who should not edit the deck.

On Windows `e` and `o` run through `cmd` with every argument quoted, so a deck path with spaces, `&` or `%` stays one
argument and runs nothing else; a path with a `"` or a line break (Windows paths have neither) is refused with a message.
One deck runs one dev server: the server keeps its working copy of the app in the deck's `.slide-ng/app`, and a second one would
replace it under the first. So a second `slide-ng dev` on the same deck stops before it changes anything (whatever its `--port`) and
names the running one; a port that is already in use stops it too. Run two decks side by side from their own folders, each with its own `--port`.
A server that was killed leaves `.slide-ng/dev.lock` behind; the next start sees that its process is gone and takes over.
The dev server keeps watching after an editor saves by renaming a new file over the old one (vim, JetBrains, `git checkout`), and a
`src:` or theme folder that is deleted and made again is watched again.

## build

Makes a static site in `dist/`. With several entries (`slide-ng build a.md b.md`) each deck is built, one after another, into
`<out>/<name>/` and served under `<base><name>/` (`dist/a/` at `/a/`, `dist/b/` at `/b/`), where `<name>` is the file name without
`.md`, as in Slidev. Two entries with the same file name, or a missing one, are refused before the first deck is built.
`--out` then belongs to the build as a whole: once the decks are in, anything else an earlier build left there (a single deck's
`index.html` and `_redirects`, the folder of a deck no longer listed) is removed, and a later build of one deck may replace it. Hosting is described in [HOSTING.md](HOSTING.md), the offline folder in [OFFLINE.md](OFFLINE.md).

| flag                | what it does                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `--out`, `-o`       | output folder (default `dist`)                                                                                      |
| `--base`            | the path the site is served from, such as `/talk/` (default `/`)                                                    |
| `--offline`         | a folder that opens from disk (`file://`), with no server; cannot be combined with `--base`                         |
| `--download`        | also export a PDF and offer it in the bar (like headmatter `download: true`)                                        |
| `--without-notes`   | leave the speaker notes out of the site                                                                             |
| `--router-mode`     | `history`, `hash` or `memory`: replaces the headmatter's `routerMode` for this build (with `--offline` only `hash`) |
| `--theme`, `-t`     | use this theme instead of the headmatter's                                                                          |
| `--lang`            | use this language instead of the headmatter's `lang` (one deck in several languages)                                |
| `--executable-path` | the Chromium to use for the PDF and the Open Graph picture (or `CHROME_PATH`)                                       |
| `--no-sandbox`      | run that Chromium without its sandbox (root or containers, trusted decks only)                                      |
| `--allow-local`     | let that page reach loopback and private addresses                                                                  |
| `--timeout`         | milliseconds for each page Chromium renders                                                                         |

## export

Makes a PDF (default), PNG files, a PPTX or a Markdown file. It builds the deck first, unless `--dist` or `--url` says where it is.
With several entries (`slide-ng export a.md b.md`) each deck is built and exported in turn, to its own file named as for one deck;
`--output`, `--dist` and `--url` name one place, so they are refused then, and so are two decks that would get the same file name.
To export one deck of such a build, name its folder: `slide-ng export a.md --dist dist/a` serves it under the base it was built with (the
`<base href>` of its `index.html`); a `--base` that differs from it is refused.

| flag                                                 | what it does                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--format`                                           | `pdf`, `png`, `pptx` or `md`                                                               |
| `--output`, `-o`                                     | the file (or the folder for PNG); the default comes from `exportFilename` or the file name |
| `--range`                                            | slides to export, such as `1,4-5`                                                          |
| `--with-clicks`, `-c`                                | one page per click step (on by default for `pptx`; `--no-with-clicks` turns it off)        |
| `--dark`                                             | dark mode                                                                                  |
| `--per-slide`                                        | PDF: render slide by slide (slower, for very large decks; see below)                       |
| `--with-toc`                                         | PDF: an outline from the slide titles                                                      |
| `--scale`                                            | PNG and PPTX picture scale, 0.25 to 8 (default 2)                                          |
| `--omit-background`                                  | PNG: a transparent background                                                              |
| `--timeout`, `--wait`, `--wait-until`                | how long to wait for each page (ms), extra wait (ms), and the load state to wait for       |
| `--dist`                                             | export an existing build, with the router mode it was built with                           |
| `--url`                                              | export a running server (such as the dev server)                                           |
| `--base`                                             | the base the build at `--dist` was made with; read from its `index.html` when left out     |
| `--theme`, `-t`                                      | use this theme instead of the headmatter's                                                 |
| `--lang`                                             | use this language instead of the headmatter's `lang` (refused with `--dist` and `--url`)   |
| `--executable-path`, `--no-sandbox`, `--allow-local` | as for `build`                                                                             |

`--per-slide` joins one PDF per slide, and the joined file loses what Chromium only writes into a single document: links
from one slide to another (the table of contents, `[go](/5)`) do nothing, and the tags for screen readers are gone (the
language is kept). The command says so; leave it out unless the deck is too big to print in one go.

The headmatter's `export:` block sets the same options (`withClicks`, `perSlide`, ...); the command line wins. `output`,
`executablePath`, `--no-sandbox` and `--allow-local` are never read from a deck. As root or in a container, Chromium needs
`--no-sandbox` (or `SLIDE_NG_NO_SANDBOX=1`).

The language of a deck is chosen when it is built, so `--lang` cannot change an existing build (`--dist`) or a running
server (`--url`): build each language with `slide-ng build --lang <tag>` and export that folder.

## export-notes

Makes a PDF of the speaker notes. Takes `--output`, `--range` and the Chromium flags of `export`, and several entries as `export` does.

## format

Tidies `slides.md` in place with the same parser that reads it: blank lines around each slide's content, the frontmatter printed again as
clean YAML (comments are kept), and the speaker note at the end. Files that `src:` imports are not touched; give them as arguments to format them too.
It prints `already formatted` when there is nothing to do. Frontmatter that is not valid YAML stops it with the file, line and slide and what is wrong (in the words `dev` uses), and the file is left as it is.

## theme eject

`slide-ng theme eject [slides.md] [--dir theme] [--theme name]` copies the theme in use into a folder of the deck (`./theme` by default)
and sets `theme: ./theme`, so it can be edited. See [THEMES.md](THEMES.md).

## create

`slide-ng create <dir> [--force]` starts a new deck in `<dir>`: `slides.md`, `package.json` (scripts `dev`, `build`, `export`, `format`), a README and `.gitignore`. It refuses a folder with files; `--force` only adds the missing files (and fills in the name only in the files it adds). The `.gitignore` leaves out what `export` and `export-notes` write by default (`slides-export.pdf`, `*-export.*`, `*-notes.pdf`). A mistyped command or flag gets the nearest real one (`Unknown command "biuld". Did you mean "build"?`).

## mcp

`slide-ng mcp [slides.md]` starts the MCP server on stdio, so an agent can list, read and edit slides. See [ARCHITECTURE.md](ARCHITECTURE.md).

`slide-ng dev` serves the same tools over HTTP at `/__mcp` (the streamable HTTP transport, stateless, POST only), plus `get_info` (entry, title,
slide count, files, the dev address, the current slide) and `goto_slide` (moves every open window and answers the click step they took: a step past the slide's last click becomes the last, also for a viewer on another machine with `--remote`). It has the dev server's rules: the Host and
Origin checks, and with `--remote` the password, sent as `Authorization: Bearer <password>` with the spaces inside it as they are; spaces at its start or end are ignored, since HTTP drops them (wrong ones are limited like the login).
`mcp: false` in the headmatter turns it off. A client configuration:

```json
{ "mcpServers": { "slide-ng": { "type": "http", "url": "http://localhost:4230/__mcp" } } }
```

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
| `SLIDE_NG_LANG`       | the same as `--lang`                                           |
