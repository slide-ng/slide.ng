# Hosting a built deck

`slide-ng build` writes a static site: plain files that any web server can hand out. No Node is needed to serve it.

```sh
slide-ng build                       # ./dist, served at /
slide-ng build --base /talk/         # for https://you.github.io/talk/
slide-ng build --out public-html     # another output folder
slide-ng build --download            # also writes the PDF and adds the download button
slide-ng build --without-notes       # speaker notes are not shipped
slide-ng build --offline             # a folder that opens from disk, no server (see below and OFFLINE.md)
slide-ng build a.md b.md --base /x/  # several decks: dist/a at /x/a/, dist/b at /x/b/
```

In this repository `npm run build` is the plain Angular build (`dist/slide-ng/browser`); `slide-ng build` is the command meant for publishing.

## Safe output folders

The build empties its output folder. To be sure it never wipes something of yours, it only does so when the folder
is new, empty, or has a `.slide-ng-build` file (written by an earlier build). Any other folder with files in it is
refused with a message. The current folder, your home folder and `/` are always refused. The same rule applies to the
temporary `.slide-ng/build` folder inside the deck's folder.

With several entries each deck is built in turn into its own folder of `--out`, named after its file without `.md`, and served
under that name below `--base` (Slidev's multiple builds). The rest of `--out` is emptied, so it holds only these folders. Each folder is a whole site with its own `404.html` and `_redirects`;
a host that serves only one folder per site needs one site per deck, or a rule that sends `/x/a/*` to `/x/a/index.html`.

## What is in the build

| file                                                    | what for                                                                                     |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `index.html`, `main-*.js`, `chunk-*.js`, `styles-*.css` | the app (Monaco, Mermaid and so on are separate chunks, fetched only when a slide uses them) |
| `inline-*.js`                                           | the small scripts of `index.html`, as files (see Content-Security-Policy below)              |
| `404.html`                                              | a copy of `index.html`: GitHub Pages shows it for unknown paths, so `/talk/3` opens the app  |
| `_redirects`                                            | the same rule for Netlify                                                                    |
| `<exportFilename>.pdf`                                  | only with `--download` or `download: true` in the headmatter                                 |
| `og-image.png`                                          | the link preview picture (see below)                                                         |
| `remote-assets/`                                        | remote pictures that were downloaded (`remoteAssets: true`, or any `--offline` build)        |
| `media/`                                                | font files (KaTeX, and the web fonts with `fonts.selfHost`)                                  |
| `workers.js`                                            | only with `--offline` and Monaco: the editor's workers as text                               |
| `sw.js`, `manifest.webmanifest`                         | offline support (`pwa: true`)                                                                |

## Addresses and the base path

The deck lives at `<base>`. Every slide is `<base><number>` (history mode, the default) or `<base>#/<number>` (`routerMode: hash`).

- **History mode** needs the host to answer unknown paths with `index.html`. That is what `404.html`, `_redirects` and the examples below do.
- **Hash mode** (`routerMode: hash` in the headmatter) needs nothing from the host: the slide number is after the `#`. Use it on hosts where you cannot change this (a plain file share, some intranets).
- **Memory mode** (`routerMode: memory`) never changes the address: the deck always opens at slide 1 and a link such as `<base>7` or `<base>presenter/1` opens slide 1 too. Use it for a kiosk or a deck shown inside another page. Only the print pages that export opens are read from the address, so `--download` and the Open Graph picture still work. The other pages of the app (`/presenter`, `/notes`, `/overview`, `/entry` and `/notes-edit`) cannot be opened by their address either, and a new tab or window starts at slide 1: open the presenter with the bar's button in the same window. In the dev server the slide is kept when the page reloads after a save (in that tab only).
- `slide-ng build --router-mode history|hash|memory` replaces the headmatter's `routerMode` for one build; the build records it in `index.html`, so `export --dist` opens the build with the right addresses. `--offline` always uses hash mode: `--router-mode memory` is refused there, and a headmatter `routerMode: memory` is replaced with a warning.
- `--base` is a path such as `/talk/`, not a full address. All files are found relative to it, so the same build works under any prefix as long as you built it for that prefix.

## GitHub Pages

```yaml
# .github/workflows/pages.yml
name: Deploy slides
on:
  push: { branches: [main] }
permissions: { pages: write, id-token: write, contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.deployment.outputs.page_url }}' }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npx playwright-core install --with-deps chromium # only if you use --download or seoMeta.ogImage: auto
      - run: npx slide-ng build --base /${{ github.event.repository.name }}/ --download
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - id: deployment
        uses: actions/deploy-pages@v4
```

`404.html` is already in the build. For a user site (`you.github.io`) use `--base /`.

## Netlify

The build contains `_redirects`. Or use `netlify.toml`:

```toml
[build]
  command = "npx slide-ng build"
  publish = "dist"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Vercel

```json
{
  "buildCommand": "npx slide-ng build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Docker with nginx

```dockerfile
FROM node:22 AS build
WORKDIR /deck
COPY . .
RUN npm ci && npx slide-ng build

FROM nginx:alpine
COPY --from=build /deck/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;       # history mode: unknown paths are deck addresses
  }
  location ~* \.(js|css|woff2?|png|jpg|svg)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";   # file names contain a hash
  }
  location = /sw.js {
    add_header Cache-Control "no-cache";    # the offline worker must be checked for updates
  }
}
```

Under a sub-path build with `--base /talk/`, put the files in `/usr/share/nginx/html/talk/` and use `try_files $uri $uri/ /talk/index.html;`.

## Content-Security-Policy

`index.html` has no inline script: the few lines Angular adds there (they switch the full stylesheet on once the page has loaded)
are written to `inline-*.js` next to it. A host that sends a strict policy therefore runs the deck, as long as styles may be inline
(Angular puts the styles of the components in `<style>` elements). This policy was tried with a deck that has Monaco, Mermaid and KaTeX:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:
```

Add what the slides themselves load from elsewhere: `img-src https:` for remote pictures (or `remoteAssets: true`), `frame-src` for
`<slide-ng-youtube>` and other iframes, `font-src` and `style-src` for a web font provider (or `fonts.selfHost`).
Only `slide-ng build` moves the scripts (not `--offline`, which is opened from disk); `npm run build` in this repository is the plain Angular build and keeps them inline.

## Embedding the deck in another page

A built deck works in an `<iframe>` on another site. Give the frame the permissions the deck asks for, or the browser logs a
"Permissions policy violation" and the feature stays off: `fullscreen` for the full screen button and `screen-wake-lock`
when the wake lock is on (`wakeLock: true` in the headmatter, or switched on in the settings). Leave `wakeLock` off for a
deck that is mostly shown embedded.

```html
<iframe
  src="https://you.github.io/talk/"
  allow="fullscreen; screen-wake-lock"
  width="960"
  height="540"
></iframe>
```

A host that sends `frame-ancestors` or `X-Frame-Options` must allow the page that embeds the deck.

## The PDF download button

Headmatter `download: true` shows a download button in the nav bar and the settings menu. It is enabled only if the page
can really fetch a PDF next to it (so it stays disabled in `npm start` and in builds made without `--download`).
`slide-ng build --download` makes the PDF with the same code as `slide-ng export` and writes it as `<exportFilename>.pdf`
(a plain file name, see [SYNTAX.md](SYNTAX.md#the-page-export-and-build)). `download: https://example.com/talk.pdf` points the button at a
file somewhere else, and no PDF is made.

## Link previews (Open Graph)

The headmatter's `seoMeta` becomes `og:` and `twitter:` tags. `seoMeta.ogImage` can be a web address, `auto` (a screenshot
of slide 1 is made during the build, 1470 x 828, and written as `og-image.png`), or left out: an `og-image.png` in the
deck's folder is copied and used automatically. Crawlers need a full address, so set `seoMeta.ogUrl` to the public address
of the deck; without it the tag points at `<base>og-image.png`.

## Remote pictures

With `remoteAssets: true` the build downloads the remote pictures a deck uses (markdown `![](https://...)`, `<img src>`, CSS
`url()`, and the frontmatter keys `image`, `background`, `backgroundImage`, `poster`) into `remote-assets/` and rewrites the
slides to use them. Only answers with an `image/*` content type that also start like a PNG, JPEG, GIF, WebP, AVIF or ICO file, up to 20 MB, are taken; anything
else is left as it is and reported. SVG pictures are not downloaded (a served `.svg` can run script); save the file into the deck instead.
The download runs on the machine that builds, so it refuses addresses that are not public (loopback, link-local such as the cloud metadata
address, private ranges), also when a name resolves to one and also after a redirect (at most 3 redirects are followed), and it stops reading at the size limit.
Build decks you do not trust without `remoteAssets` all the same. Tests that use a local server as the "remote" set `SLIDE_NG_ALLOW_LOCAL_FETCH=1`; nothing else should.

## Web fonts

`fonts:` in the headmatter loads web fonts from a provider with an `@import` (as Slidev does). That needs the network when the
deck is shown. With `fonts: { selfHost: true }` the build downloads the provider's style sheet and every font file in it and serves
them from the build (`media/`), so the deck does not call the provider. It is on by default for `pwa: true` and `build --offline`
(`selfHost: false` turns it off). Google's answer depends on the browser name, so the download asks as a current Chrome and gets woff2 files.
If the download fails the build warns and the deck keeps the `@import`. `provider` can be `google`, `coollabs`, `none`, or the address of a
Google-compatible `css2` endpoint (a mirror in your company), which needs `fonts: { allowCustomProvider: true }`; any other address is a build error.
Only the `@font-face` rules of the provider's sheet are kept, and a font file must start like woff2, woff, otf or ttf. The download follows the same address rules as the pictures (no address that is not public, 3 redirects, size limits).
The download runs on the machine that builds: build decks from others without `selfHost`, as with `remoteAssets`.
Tested against a local fake provider only (`tests/export/offline.mjs`, `offline-net.mjs`); real Google Fonts were not called: NOT VERIFIED.

## Offline folder

`slide-ng build --offline` makes a folder you can open from disk (`file://`) and copy to a USB stick. It forces `base ./`, `routerMode: hash`,
no service worker, and bundles the app and its lazy chunks into one classic script, because Chromium does not run module scripts from `file://`.
It cannot take `--base`. Remote pictures and web fonts are downloaded into the folder by default. Details, limits and the checklist for the day before are in
[OFFLINE.md](OFFLINE.md). Any other build can also be served from a folder with `python3 -m http.server` or `npx serve`.

## Offline use (PWA)

`pwa: true` (or `pwa: build`) makes the build write `manifest.webmanifest` and `sw.js`, a small service worker that stores
every file of the build the first time the deck is opened. The first visit must be online: a browser that never opened the deck cannot get it without a network (OFFLINE.md). It also draws install icons (192 and 512 pixels, plus a maskable 512) and lists them in
the manifest, so the deck can be installed. The picture is `public/icon.png`, else `public/icon.svg`, else a local `favicon` file in `public/`,
else the slide.ng icons. Drawing a picture of your own needs Chromium, like `--download` (`CHROME_PATH` or `--executable-path`);
without it the build warns and goes on without icons. A small label in the bottom right corner of the deck says "Available offline" once everything is stored,
and "Offline" while the browser has no network (not in dev, not in the print route). After that the deck opens without a network, at any slide
address. Open the deck once while online, before the talk. Serve it over HTTPS (or `localhost`): browsers only allow
service workers there. A new build gets a new cache name, so visitors get the new version on their next visit.

## Bundle size

A deck without heavy features is about 450 kB at startup (compressed about 110 kB). Decks that use Monaco or KaTeX add their
style sheets to that (about 850 kB with both). The build warns above 1.5 MB and fails above 3 MB at startup; Monaco, Mermaid,
Magic Move and the like are lazy chunks and do not count.
