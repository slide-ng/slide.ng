# Security model

What slide.ng trusts, what it defends against, and what each flag changes. [SECURITY.md](https://github.com/slide-ng/slide.ng/blob/main/SECURITY.md) says how to report a problem; this page says what counts as one.

## Who is trusted

**The deck author is trusted, and so is whoever runs the commands.** A deck is code. Its `slides.md` can contain raw HTML (a `<script>` element is removed with a warning, and a `javascript:` or `data:text/html` address in `href`, `src` or an `<object>`'s `data` is replaced by `#`, but inline event handlers such as `onclick=` and `onerror=` are **not** removed: they run as script in the deck's page, with a warning at build time; links, components and `setup/main.ts` run code too), its `setup/*.ts` files are bundled and run by the generator (on the build machine), its `index.html` goes into the page as it is (scripts included), and a theme or addon is the same kind of code. slide.ng does not sandbox a deck from the machine that builds it. Running `slide-ng dev`, `build` or `export` on a deck you did not write is like running its code: read it first, or do it in a container.

What slide.ng does defend is the line between the trusted person and everyone else:

| who                              | can they reach slide.ng?                  | what is defended                                                                                                |
| -------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Another web page in your browser | tries the dev server through your browser | the dev server answers only its own `Host` and `Origin`; a page from another site cannot read or write anything |
| Another person on your network   | only if you start `--remote`              | the password, the session token and the file rules below                                                        |
| A malicious deck, theme or addon | you run it                                | only a few steps are guarded (reads and downloads, below); anything else is code that runs as you               |
| A person who viewed a built deck | the built deck is static files            | nothing to defend on the server; the deck has no write path (a build makes no requests to a companion server)   |

## The dev server (`npm start`)

Without `--remote` the companion server listens on `127.0.0.1` and the Angular dev server on `localhost`. Only your own machine can connect. A web page you visit cannot use it: rebinding a name to `127.0.0.1` fails the `Host` check, a cross-site request fails the `Origin` check and has no token, and a writing request must be JSON, which a plain HTML form cannot send.

What the server can do for the page that passes these checks: move `v-drag` elements and replace a slide's markdown in `slides.md` (or a file it imports with `src:`), save drawings, and save text into the files that a `<<< ./file {monaco-write}` line lists. It never accepts a file name from a request. Writes go to existing files only, never through a symbolic link, and `{monaco-write}` is limited to text-like files in the deck's folder (never `setup/`, `layouts/`, `components/` or `index.html` at the top of the deck's folder or of a theme or addon folder in it, `.git/`, `node_modules/`, package, lock, config or hidden files).

The deck browser asks the companion server whether a site may be shown in a frame (`/__slide-ng/frame-check?url=`). The server
then requests that address itself (http and https only, five seconds at most, the body is not read) and answers only true, false or
null; the answer is kept for ten minutes. It is behind the same checks as every other request, so only the page (and, with
`--remote`, a logged-in viewer) can ask, and it can learn nothing but whether an address allows framing.

The deck browser's proxy runs in the companion server, on 127.0.0.1 and a port of its own, and only without `--remote`. It answers
only host names of the form `<site>.<scheme>.<key>.localhost`, where the key is random for each session, so a page on the web cannot
make it load anything. Each proxied site has its own origin, apart from the deck's origin and from the other sites: a page shown in
it cannot read the deck's storage, and the dev server refuses its requests (wrong Host and Origin, no token). The proxy refuses to
load the deck's own servers (the dev server port, the companion and itself), also through a name that points to this machine. It
drops the headers that refuse framing and the site's Content-Security-Policy, so a page in it has less protection against
clickjacking than in a tab; it is meant for showing pages during a talk.

The deck browser's weather widget is off by default. When it is on, the page asks Open-Meteo (`api.open-meteo.com`, and
`geocoding-api.open-meteo.com` for a city name) for the weather of the chosen place. "Use my location" asks the browser
for the position (rounded to about a kilometre) and sends it once to OpenStreetMap's Nominatim for the city name; nothing else
leaves the page.

## `--remote`

`--remote` opens the dev server to your network so that others can follow the presenter. It always has a password (`--remote=secret`, `SLIDE_NG_PASSWORD`, a prompt on a terminal, or a random one that is printed). Wrong passwords are limited per client address, a login lasts 8 hours, and every other rule above still applies. The login cookie is signed with the password, so a login survives a restart of the dev server with the same password (and stops working when the password changes); it cannot be withdrawn before it runs out except by changing the password.

**Whoever has the password can edit your slides.** They can rewrite `slides.md` and everything it imports, which includes adding raw HTML and scripts that every viewer of the deck then runs, and writing the `{monaco-write}` files. They cannot write setup files, `package.json` or hidden files through the server, and cannot read any file that is not part of a slide. There is **no HTTPS**: the password, the token and the slides cross the network in clear text, so someone who can read the network traffic can take the login. Use it on a network you trust, share the password only with people you would let edit the deck, and stop the server when the talk is over.

The dev server's MCP endpoint (`/__mcp`) has the same rules: Host and Origin checks, and with `--remote` the password as `Authorization: Bearer <password>` (spaces inside the password included; spaces at its start or end are ignored, since HTTP drops them from a header; a password that is not ASCII counts as UTF-8 or as Latin-1), with the same limit on wrong passwords (the login cookie is not accepted there: it is only sent to `/__slide-ng`). Whoever has the password can use its tools, which edit slides like the side editor and move every open window. It has no session token: a program cannot read one, and a page from another site still fails the Origin check. `mcp: false` turns it off.

The server refuses an edit that would switch on `allowOutsideRoot` or `fonts.allowCustomProvider` (so a password holder cannot make the deck read your files or fetch from a provider of their choice); those can only be turned on by editing the file yourself. The MCP tools follow the same rule. If the deck already has `allowOutsideRoot: true`, a password holder can use it: add `<<< ~/.ssh/id_rsa` and read the page.

## Reading files: `<<<` and `src:`

Snippets (`<<< ./file`) and imported slides (`src:`) must be inside the deck's folder or a theme or addon folder, judged by the real path (a symbolic link that leads out does not count). Otherwise the build stops with an error. A leading `/` in `src:` means the deck's folder, as in Slidev. The deck can opt out with `allowOutsideRoot: true` in its **own** headmatter, or in its config file `slide-ng.config.yaml`, which is read only from the folder of `slides.md` and only when it is really there (a theme cannot set it for the deck). The dev server and the MCP tools cannot write the config file. The MCP `get_slide` tool checks the same rule.

## Downloads at build time

`remoteAssets` and `fonts.selfHost` (on for `pwa` and `build --offline`) download from the network on the machine that builds. They refuse loopback, link-local (cloud metadata), private and other non-public addresses, also after a redirect and also for a name that resolves to one, follow at most 3 redirects, stop at a size limit, accept only files that start like a picture or a font, and never download SVG. `fonts.provider` must be a known provider (`google`, `coollabs`) unless the deck sets `fonts.allowCustomProvider: true`. A deck without these options downloads nothing.

## Export (`export`, `build --download`, the open graph picture)

The exporter loads the deck in Chromium. Chromium keeps its sandbox; as root or in a container it cannot start that way, so you have to pass `--no-sandbox` (or `SLIDE_NG_NO_SANDBOX=1`), which you should do only for decks you trust. While exporting, the page cannot reach loopback, private or link-local addresses other than the exporter's own server (`--allow-local` removes that). A deck can embed anything a web page can, and the result ends up in the PDF or the pictures, so treat exporting an untrusted deck as running it. The headmatter cannot set `executablePath`, `output`, `--no-sandbox` or `--allow-local`.

## Files the tools write

The tools write in the deck's `.slide-ng/` folder and, for a build or export, in the output folder. They refuse a `.slide-ng` that is a symbolic link, remove only folders whose real path is inside the deck, and empty an output folder only when it is new, empty or marked as made by slide.ng.

## What each flag changes

| flag or headmatter option                     | effect on safety                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--remote[=password]`, `--bind <address>`     | opens the dev server to the network; password required; writes are possible with it (see above) |
| `SLIDE_NG_PASSWORD`                           | the `--remote` password from the environment instead of the command line                        |
| `allowOutsideRoot: true` (headmatter)         | snippets and `src:` may read any file the builder can read                                      |
| `remoteAssets: true`, `fonts.selfHost`, `pwa` | the build downloads pictures and fonts from the deck's addresses (public addresses only)        |
| `fonts.allowCustomProvider: true`             | a font provider other than Google Fonts or coolLabs                                             |
| `--no-sandbox`, `SLIDE_NG_NO_SANDBOX=1`       | Chromium for export runs without its sandbox                                                    |
| `--allow-local`                               | an exported page may reach loopback and private addresses                                       |
| `SLIDE_NG_ALLOW_LOCAL_FETCH=1`                | for tests only: build-time downloads may use local addresses                                    |
| `--theme`, `theme:`, `addons:`                | a theme or addon is code the generator runs; install only what you trust                        |

## Not covered

- The built deck runs the author's HTML and scripts in the viewer's browser. Notes are part of a public build unless `--without-notes`.
- `{monaco-run}` runs code in a frame without access to the slide, with the limits of a sandboxed iframe, not as a security promise for code you do not trust.
- Dependencies are not audited here; CI has a non-blocking `npm audit` job. The PDF library is `@cantoo/pdf-lib`, a maintained fork of the unmaintained `pdf-lib` (see [DECISIONS.md](DECISIONS.md)).
- Nothing was tried on a real network with a second machine.
