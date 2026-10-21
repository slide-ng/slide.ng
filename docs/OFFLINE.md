# Presenting without a network

A checklist for the day before a talk in a room with no internet (or one you do not trust). There are three ways to carry
a deck; pick one, and rehearse it on the machine you will present from.

|                                                 | works with no network | needs a first visit online | needs a server             | opens by double click |
| ----------------------------------------------- | --------------------- | -------------------------- | -------------------------- | --------------------- |
| **Offline folder** (`slide-ng build --offline`) | yes                   | no                         | no                         | yes                   |
| **PWA** (`pwa: true`, a normal build)           | yes, after one visit  | **yes**                    | yes (HTTPS or `localhost`) | no                    |
| **PDF** (`slide-ng export`)                     | yes                   | no                         | no                         | yes                   |

What was tested, and where it was not, is written at the end of this page. "Tested" always means Chromium (the engine of Chrome and Edge).

## Option 1: an offline folder (recommended)

```sh
slide-ng build --offline --out talk-offline       # add --download to put the PDF in the folder too
```

Copy `talk-offline` to the presenting machine (or a USB stick) and open `talk-offline/index.html` in Chrome or Edge. No server, no install.

What the flag does:

- One classic script holds the app and all its lazy chunks (Mermaid, Monaco, KaTeX). Chromium does not run `type="module"` scripts or `import()` from `file://`, so a normal build shows a blank page there.
- Addresses are relative and there is no `<base>`: the folder works from any place on disk. The slide is after a `#` (`index.html#/3`); `routerMode` is forced to `hash`.
- No service worker (browsers do not allow one on `file://`), so `pwa` is ignored.
- Pictures from other servers (`remoteAssets`) are downloaded into the folder, unless the deck says `remoteAssets: false`.
- Web fonts (`fonts:`) are downloaded into the folder, unless the deck says `fonts: { selfHost: false }`.
- Monaco's workers are stored as text in `workers.js` and started from blobs, because Chromium refuses `new Worker('file://...')`.
- Files of `public/` written with a leading slash in slides (`![](/photo.png)`) are found next to the page. (A build with `--base /talk/` now puts `/talk/` in front of them as well.)
- Not in a slide's `<style>`: `url(/photo.png)` there cannot be rewritten (the Angular build would try to bundle a relative address), so it looks for the file at the disk root and the build warns. Use an inline `style="background-image: url(/photo.png)"` or an `<img>`, which are rewritten.

Things to know:

- **Size and start-up.** All lazy code is in one file, so a deck with Monaco and Mermaid is a large script (the phase 2 test deck: 27 MB folder, 16 MB script; it opened in about 2.5 s on the test machine). A deck without them is about 450 kB.
- **The PDF button** opens `<exportFilename>.pdf` in a new tab (a page opened from disk cannot make the browser save a file); save it from the PDF viewer.
- **Two decks in one browser.** All `file://` pages share one storage and one broadcast channel. Drawings and window sync are therefore kept per folder (the folder's path is part of the key), so an old deck that is still open does not follow the new one.
- **Several windows** (presenter and audience) sync with a `BroadcastChannel`. They must be windows of the same browser profile, opened from the same folder. Open the presenter page with the button in the bar or at `index.html#/presenter/1`, and the audience page in a second window at `index.html#/1`. From a folder, the audience window may also drive the presenter (it is on this machine by definition). Drawings, sync and the settings kept in the browser belong to the folder, so two decks opened from disk do not mix (dark mode is shared).
- **Not offline by nature:** PlantUML (a picture from a PlantUML server), `<slide-ng-youtube>`, `<slide-ng-tweet>`, `<slide-ng-blue-sky>`, and any picture or font you reference by address and that could not be downloaded at build time (the build warns). Check the build output for `could not download` lines.
- Camera, screen share and recording on `file://` were not tried (see the end).

### If you do not want a special build

Any static folder works with a tiny server, and then the normal build with history routing is fine:

```sh
slide-ng build --out dist && cd dist && python3 -m http.server 8080     # or: npx serve dist
```

Open `http://localhost:8080`. This is also the way if you use a browser that is not Chromium-based (see the end).

## Option 2: PWA (`pwa: true`)

Slidev's own offline support is this one, and slide.ng matches it: the build writes `sw.js`, a manifest and install icons, and the browser stores every file of the deck the first time it is opened. The corner label says "Available offline" when everything is stored.

The limit, honestly: **a browser that has never opened the deck cannot get it without a network.** The worker is installed by the first visit, so the first visit must be online (or from a server on the same LAN as the room). A new browser profile, a private window, cleared site data, or another computer starts from nothing. Browsers may also delete site data of pages not opened for a long time. Needs HTTPS or `localhost`.

So, with a PWA: open the deck once on the presenting machine, in the browser profile you will use, while online. Wait for "Available offline". Then turn the network off and reload; the deck must open. Do this the evening before, not in the room. A deck with `pwa: true` also downloads its web fonts into the build, so they are in the stored files.

## Option 3: a PDF

```sh
slide-ng export --format pdf --with-clicks        # one page per click step
```

The most robust: any computer opens a PDF. You lose animations, live code, Monaco, drawing and the presenter view; the notes can be exported on their own with `slide-ng export-notes`. Keep the PDF next to the folder as the plan C.

## The checklist

The day before:

1. Build the folder (`slide-ng build --offline --download --out talk-offline`) and read the output for `could not download` or `fonts:` warnings.
2. Copy it to the machine you present from, to a second place (USB stick, other laptop) and the PDF with it.
3. Turn the network off (aeroplane mode, not only "no internet": also test with the Wi-Fi switched off).
4. Open `index.html`. Step through every slide and every click once. Look at: pictures, the fonts you chose, math, diagrams, Monaco slides, embedded videos (a video file must be in `public/`, a link to YouTube cannot work).
5. Open the presenter page and a second window, and move in one: the other must follow. Check the notes and the timer.
6. Test the projector or screen: resolution, full screen (`f`), and that the second window ends up on the screen you want.
7. Check the laptop: charged, no sleep during the talk, no update scheduled.

In the room:

- Open the folder before the talk starts, not after. Keep the PDF open in another tab or on the desktop.
- If the browser shows a blank page, you opened a normal build from disk: use the offline folder, or start the small server above.

## What was tested

Run by `npm run test:export` ([`tests/export/offline.mjs`](https://github.com/slide-ng/slide.ng/blob/main/tests/export/offline.mjs), [`tests/export/offline-net.mjs`](https://github.com/slide-ng/slide.ng/blob/main/tests/export/offline-net.mjs)), in Chromium with `playwright-core`:

- An offline folder opened with `file://`, no server: first slide, right arrow (click, then next slide), the next button with the mouse, hash addresses, reload, overview, KaTeX with its font file, Mermaid, Monaco (styled, syntax colours, worker started from a blob), the image layout, a `/public` picture, a picture from a stopped "remote" server, a web font from a stopped fake font provider, the PDF button, no console error or failed request.
- The presenter page, a second window opened with `window.open`, sync in both directions between `file://` pages, and no sync between two folders.
- A normal `pwa` build served over HTTP, then the network switched off (`context.setOffline(true)`): presenter and audience windows follow each other in both directions, notes show, the page reloads from the service worker's store with the server stopped, with its font and picture. A fresh browser with no network cannot open the deck (the limit above).

**NOT VERIFIED:**

- Firefox and Safari. Firefox treats every `file://` page as its own origin, so window sync from a folder probably does not work there; Safari limits `file://` more. Use the local server for them.
- Camera, microphone, screen share and recording on `file://` (browsers want a secure context; a local folder may or may not count).
- Opening the folder from a network share or a USB stick on another operating system (only a local disk was tried).
- An update of a PWA that is already installed, and how long a browser keeps the stored deck.
- Real projectors, full screen on a second display, and the wake lock.
