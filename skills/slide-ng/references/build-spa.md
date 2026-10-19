---
name: build-spa
description: slide-ng build - a static site, the base path, routing and safe output folders
---

# Build and host

```sh
slide-ng build                    # ./dist, served at /
slide-ng build --base /talk/      # for https://you.github.io/talk/
slide-ng build --out public-html
slide-ng build --download         # also writes the PDF and adds the download button
slide-ng build --without-notes    # speaker notes are not shipped
slide-ng build --offline          # a folder that opens from disk, see offline-folder.md
slide-ng build --router-mode hash # replaces the headmatter's routerMode for this build
```

Verify: the last line is `Built N slides into <out> (base /talk/).` and `<out>/index.html` exists.

- The output is plain files; any web server hands them out.
- **History mode** (default) needs the host to answer unknown paths with `index.html`. The build writes `404.html` (GitHub Pages) and `_redirects` (Netlify). Nginx: `try_files $uri $uri/ /index.html;`. Vercel: a rewrite of `/(.*)` to `/index.html`.
- **Hash mode** (`routerMode: hash`) needs nothing from the host: addresses are `/#/3`.
- **Memory mode** (`routerMode: memory`) never changes the address: the deck opens at slide 1, deep links and `/presenter` links open slide 1 too. For kiosks; `--download` still works.
- `--base` is a path (`/talk/`), not a full address. Build for the prefix you deploy under.
- Files of `public/` that slides name with a leading slash (`/photo.png`, `<img src>`, `<video src poster>`, `url()`) get the base in front in a build.
- **Safe output**: the build empties its output folder only when it is new, empty, or has a `.slide-ng-build` file. Any other folder with files is refused. The current folder, your home folder and `/` are always refused.
- Size: a deck without heavy features is about 450 kB at start; with Monaco and KaTeX about 850 kB. Budget warns at 1.5 MB, fails at 3 MB. Monaco, Mermaid and Magic Move are lazy chunks.
- Only `--download`, `seoMeta.ogImage: auto` and the `pwa` icons need Chromium (`CHROME_PATH`), also in CI (`npx playwright-core install --with-deps chromium`).
- In the slide.ng repository `npm run build` is the plain Angular build; `slide-ng build` is the command for publishing.

<!-- verify -->

```md
---
title: Build and host
routerMode: hash
---

# Hash routing

Addresses look like /#/3 and need no server rewrite.
```
