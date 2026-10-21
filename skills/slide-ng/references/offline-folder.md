---
name: offline-folder
description: slide-ng build --offline - a folder that opens from disk with no server
---

# Offline folder (recommended for talks without internet)

```sh
slide-ng build --offline --out talk-offline       # add --download to put the PDF in the folder too
```

Copy the folder to the presenting machine and open `talk-offline/index.html` in **Chrome or Edge**. No server, no first visit online.

Verify: the output contains `Offline folder: one classic script (N chunks folded in), no service worker, hash routing.`; then open `index.html` with the network off and step through every slide.

What the flag does:

- One classic script holds the app and its lazy chunks (Mermaid, Monaco, KaTeX): Chromium refuses module scripts and `import()` from `file://`, so a normal build is a blank page there.
- Addresses are relative, no `<base>`; slides are after a `#` (`index.html#/3`); `routerMode` is forced to `hash`. It cannot take `--base`.
- No service worker, so `pwa` is ignored.
- Remote pictures (`remoteAssets`) and web fonts (`fonts.selfHost`) are downloaded into the folder, unless the deck turns them off.
- Monaco's workers are started from blobs.
- Presenter at `index.html#/presenter/1`, audience at `index.html#/1` in a second window of the same browser profile and folder; they sync with a BroadcastChannel. Drawings, sync and stored settings are kept per folder (dark mode is shared).
- The PDF button opens `<exportFilename>.pdf` in a new tab.

Still needs the network: PlantUML, `<slide-ng-youtube>`, `<slide-ng-tweet>`, `<slide-ng-blue-sky>`, and pictures or fonts that could not be downloaded at build time (watch the build for `could not download`).

Size: a deck with Monaco and Mermaid can be a 16 MB script; a plain deck is about 450 kB.

Any other build can be served with `cd dist && python3 -m http.server 8080` (also for Firefox and Safari).

<!-- verify -->

```md
---
title: Offline talk
remoteAssets: true
fonts:
  sans: Inter
  selfHost: true
---

# Works without a network

![](/photo.png)
```
