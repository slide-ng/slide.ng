# Interface text

Every word of slide.ng's own interface (the bar and its tooltips, the settings menu, the overview, the goto box, the right-click menu,
the presenter, the info dialog, the drawing toolbar, the offline badge, the copy and run buttons of code blocks) has a key. English is the
default; `src/app/i18n/en.ts` holds it and is the source of truth for the keys. How to choose a language and add a translation is in
[SYNTAX.md](SYNTAX.md#translating-the-interface).

## How it works

- **Language.** The headmatter's `uiLang`, else `lang`, picks the interface language (`lang: tr`). Without either it is English.
- **Translations.** `locales/<lang>.json` in the built-in theme (`src/app/i18n/locales/`), the theme, each addon and the deck's folder,
  in that order, are put over English key by key, so the deck has the last word. In each folder `pt.json` is read before `pt-BR.json`.
  A file is flat JSON: `{ "nav.next": "Sonraki slayta git" }`. A missing key, or a language with no file, stays English.
- **Checks.** The generator warns about a key English does not have, a value that is not text and a placeholder that was lost or added
  (that key stays English). A file that is not JSON stops the build. `scripts/lib/ui-text.spec.ts` checks every `locales/*.json` of the
  repository, and `src/app/i18n/templates.spec.ts` fails on English written into a template instead of a key.
- **Placeholders.** `{no}`, `{total}`, `{title}` and the others are filled in by the app; keep them, in any order the sentence needs.
  `info.credit` and `menu.nativeHint` are drawn around their placeholder (`{name}` is bold, `{key}` is a key cap).
- **In code.** The generator writes the merged translations and the locale into `src/slides/generated/ui-text.ts` (plain data, so it
  works offline and in an export). `app.config.ts` provides it as the `UI_TEXT` injection token and `LOCALE_ID`. Templates use the
  `t` pipe, `{{ 'nav.next' | t }}` or `{{ 'presenter.noNotes' | t: { no: nav.no() } }}`; TypeScript uses `Ui.text(key, params)` or
  `uiText(inject(UI_TEXT), key, params)` (all in `src/app/i18n/`). A theme's component can import the pipe from `slide-ng/i18n/t`.
- **Locale.** `lang` also sets `LOCALE_ID` for the `date`, `number`, `currency` and `percent` pipes, when Angular has data for it
  (`pt-BR`, else `pt`); only that locale's data is added to the build (with `languages`, each language's, and the generated
  `ui-text.ts` holds every language's text). `ar`, `he`, `fa` and `ur` set `dir="rtl"` on the page unless
  `htmlAttrs.dir` is given; the bar, menus, goto box and presenter use logical CSS (`start`, `end`), so they mirror.
- **Direction of the interface text.** When `uiLang` is written the other way than the page (`lang: ar` with `uiLang: en`, or
  `uiLang: he` in a left-to-right deck), every interface text is a bidi isolate of the interface language's direction (the Unicode
  marks LRI or RLI ... PDI, added by `mergeUiText` from `UI_DIR` of the generated `ui-text.ts`), so "2 slides" and "No notes for
  slide 2." keep their order. The layout still follows the page. The dev side editor and the notes editor take each line's
  direction from its first letter (`unicode-bidi: plaintext`), so a line that mixes Arabic and Latin is not reordered.
- **Keys in a right-to-left page.** Left and right stay physical, as in Slidev: right (and space) is the next click, left the
  previous one, and a selected `slide-ng-drag` element moves the way the arrow points. In the quick overview the arrows follow the
  mirrored grid: left goes to the next card, which is on the left. Transitions are not mirrored: `slide-left` still slides to the
  left.
- **Built-in translations.** Turkish (`tr`). A built-in translation must have every key (the unit test checks it).

## Keys

### The bar

| key                   | English                             |
| --------------------- | ----------------------------------- |
| `nav.fullscreenEnter` | Enter fullscreen                    |
| `nav.fullscreenExit`  | Close fullscreen                    |
| `nav.prev`            | Go to previous slide                |
| `nav.next`            | Go to next slide                    |
| `nav.overview`        | Show slide overview                 |
| `nav.darkOn`          | Switch to dark mode theme           |
| `nav.darkOff`         | Switch to light mode theme          |
| `nav.laserOn`         | Enable laser pointer                |
| `nav.laserOff`        | Disable laser pointer               |
| `nav.cursorShow`      | Show presenter cursor               |
| `nav.cursorHide`      | Hide presenter cursor               |
| `nav.drawingShow`     | Show drawing toolbar                |
| `nav.drawingHide`     | Hide drawing toolbar                |
| `nav.play`            | Play Mode                           |
| `nav.presenter`       | Presenter Mode                      |
| `nav.editorShow`      | Show editor                         |
| `nav.editorHide`      | Hide editor                         |
| `nav.download`        | Download as PDF                     |
| `nav.downloadMissing` | Download as PDF (not in this build) |
| `nav.info`            | Show info                           |
| `nav.layout`          | Toggle Presenter Layout             |
| `nav.settings`        | More Options                        |
| `nav.move`            | Drag to move the bar                |
| `nav.cameraShow`      | Show camera view                    |
| `nav.cameraHide`      | Hide camera view                    |
| `nav.recordStart`     | Start recording                     |
| `nav.recordStop`      | Stop recording                      |
| `nav.recordPause`     | Pause recording                     |
| `nav.recordResume`    | Resume recording                    |

### The settings menu

| key                           | English                                        |
| ----------------------------- | ---------------------------------------------- |
| `settings.invert`             | Invert                                         |
| `settings.brightness`         | Brightness                                     |
| `settings.contrast`           | Contrast                                       |
| `settings.saturation`         | Saturation                                     |
| `settings.sepia`              | Sepia                                          |
| `settings.hueRotate`          | Hue Rotate                                     |
| `settings.filterValue`        | {name} value                                   |
| `settings.cursorStyle`        | Cursor Style                                   |
| `settings.cursor`             | Cursor                                         |
| `settings.laser`              | Laser                                          |
| `settings.slideScale`         | Slide Scale                                    |
| `settings.fit`                | Fit                                            |
| `settings.navPosition`        | Nav Bar Position                               |
| `settings.navPositionDefault` | Deck Default                                   |
| `settings.navTopLeft`         | Top left                                       |
| `settings.navTopCenter`       | Top center                                     |
| `settings.navTopRight`        | Top right                                      |
| `settings.navBottomLeft`      | Bottom left                                    |
| `settings.navBottomCenter`    | Bottom center                                  |
| `settings.navBottomRight`     | Bottom right                                   |
| `settings.wakeLock`           | Wake Lock                                      |
| `settings.hideIdleCursor`     | Hide Idle Cursor                               |
| `settings.presenterCursor`    | Show Presenter Cursor                          |
| `settings.darkMode`           | Dark Mode                                      |
| `settings.downloadHint`       | The PDF is added by: slide-ng build --download |
| `settings.camera`             | Camera                                         |
| `settings.microphone`         | Microphone                                     |
| `settings.defaultDevice`      | Default                                        |
| `settings.mirrorCamera`       | Mirror camera                                  |
| `settings.record`             | Record                                         |
| `settings.recordScreen`       | Screen                                         |
| `settings.recordCamera`       | Camera                                         |

### The overview and the goto dialog

| key                  | English                   |
| -------------------- | ------------------------- |
| `overview.label`     | Slide overview            |
| `overview.goTo`      | Go to slide {no}          |
| `overview.goToTitle` | Go to slide {no}: {title} |
| `overview.close`     | Close                     |
| `goto.placeholder`   | Goto...                   |
| `goto.label`         | Go to slide               |
| `goto.results`       | Slides                    |

### The right-click menu

| key                   | English                                                    |
| --------------------- | ---------------------------------------------------------- |
| `menu.label`          | Slide menu                                                 |
| `menu.prevClick`      | Previous Click                                             |
| `menu.nextClick`      | Next Click                                                 |
| `menu.prevSlide`      | Previous Slide                                             |
| `menu.nextSlide`      | Next Slide                                                 |
| `menu.presenterEnter` | Enter Presenter Mode                                       |
| `menu.presenterExit`  | Exit Presenter Mode                                        |
| `menu.barShow`        | Show Navigation Bar                                        |
| `menu.barReset`       | Reset Navigation Bar Position                              |
| `menu.nativeHint`     | Hold {key} and right click to open the native context menu |

### The info dialog and the offline badge

| key               | English                              |
| ----------------- | ------------------------------------ |
| `info.credit`     | Made with {name}, inspired by Slidev |
| `offline.offline` | Offline                              |
| `offline.ready`   | Available offline                    |

### Pages: what screen readers hear on a new slide, and the tab titles

| key                   | English                        |
| --------------------- | ------------------------------ |
| `deck.announce`       | Slide {no} of {total}          |
| `deck.announceTitle`  | Slide {no} of {total}: {title} |
| `presenter.pageTitle` | Presenter - {title}            |
| `notes.pageTitle`     | Notes - {title}                |

### The presenter

| key                       | English                           |
| ------------------------- | --------------------------------- |
| `presenter.current`       | Current                           |
| `presenter.slides`        | Slides                            |
| `presenter.mirror`        | Screen Mirror                     |
| `presenter.next`          | Next                              |
| `presenter.mirrorStart`   | Choose a screen or window to show |
| `presenter.mirrorStop`    | Stop sharing                      |
| `presenter.end`           | End of the presentation           |
| `presenter.noNotes`       | No notes for Slide {no}.          |
| `presenter.noNotesAtAll`  | No notes.                         |
| `presenter.fontBigger`    | Increase font size                |
| `presenter.fontSmaller`   | Decrease font size                |
| `presenter.clicks`        | Clicks in this slide: {count}     |
| `presenter.click`         | Click {no}                        |
| `presenter.regionCurrent` | Current slide                     |
| `presenter.regionNext`    | Next step                         |
| `presenter.regionNotes`   | Notes                             |
| `timer.start`             | Start the timer                   |
| `timer.pause`             | Pause the timer                   |
| `timer.reset`             | Reset the timer                   |

### The progress bar (its name, and its minutes with `progressBar: { minutes: true }`)

| key                    | English                     |
| ---------------------- | --------------------------- |
| `progress.label`       | Progress through the slides |
| `progress.minutes`     | {n} min                     |
| `progress.minutesLeft` | {n} min left                |
| `progress.minutesOver` | {n} min over                |

### The drawing toolbar

| key                  | English                                     |
| -------------------- | ------------------------------------------- |
| `drawing.stylus`     | Draw with stylus                            |
| `drawing.line`       | Draw a line                                 |
| `drawing.arrow`      | Draw an arrow                               |
| `drawing.ellipse`    | Draw an ellipse                             |
| `drawing.rectangle`  | Draw a rectangle                            |
| `drawing.erase`      | Erase                                       |
| `drawing.width`      | Adjust stroke width                         |
| `drawing.widthValue` | Stroke width                                |
| `drawing.color`      | Brush color: {color}                        |
| `drawing.red`        | red                                         |
| `drawing.yellow`     | yellow                                      |
| `drawing.green`      | green                                       |
| `drawing.blue`       | blue                                        |
| `drawing.purple`     | purple                                      |
| `drawing.white`      | white                                       |
| `drawing.black`      | black                                       |
| `drawing.undo`       | Undo                                        |
| `drawing.redo`       | Redo                                        |
| `drawing.clear`      | Delete                                      |
| `drawing.pin`        | Pin drawing                                 |
| `drawing.unpin`      | Unpin drawing                               |
| `drawing.close`      | Close the drawing tools                     |
| `drawing.closeKeep`  | Close the drawing tools (the drawing stays) |

### Inside slides: code blocks, runners, embeds and a slide that fails

| key                   | English                                                                   |
| --------------------- | ------------------------------------------------------------------------- |
| `code.running`        | Running...                                                                |
| `code.idle`           | Click the play button to run the code                                     |
| `code.run`            | Run code                                                                  |
| `code.copy`           | Copy                                                                      |
| `code.copied`         | Copied                                                                    |
| `embed.tweetFailed`   | Could not load tweet                                                      |
| `embed.blueskyFailed` | Could not load Bluesky post                                               |
| `slide.errorDev`      | An error occurred on this slide. Check the terminal for more information. |
| `slide.errorBuild`    | Failed to fetch this slide. Please check your network connection.         |

### The dev server: the side editor, the banner for a deck that does not read and the password prompt

| key                    | English                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `editor.slide`         | Slide {no}                                                            |
| `editor.close`         | Close editor                                                          |
| `editor.markdown`      | Markdown of this slide                                                |
| `editor.loading`       | Loading...                                                            |
| `editor.saved`         | Saved                                                                 |
| `editor.saving`        | Saving...                                                             |
| `editor.error`         | Could not save                                                        |
| `editor.conflict`      | Changed in the file, not saved: copy your text and reopen the slide   |
| `editor.problem`       | slides.md could not be read, showing the last good version: {problem} |
| `editor.problemSlides` | Some slides could not be read and are left out: {problem}             |
| `dev.password`         | Password for this slide.ng session                                    |

### The sync and language menus, the click preview and the notes pages

| key                           | English                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `nav.clickPreviewShow`        | Show upcoming clicks                                                                     |
| `nav.clickPreviewHide`        | Hide upcoming clicks                                                                     |
| `nav.sync`                    | Change sync settings                                                                     |
| `sync.for`                    | Slides navigation syncing for                                                            |
| `sync.viewer`                 | viewer                                                                                   |
| `sync.presenter`              | presenter                                                                                |
| `sync.mode`                   | Sync Mode                                                                                |
| `sync.bidirectional`          | Bidirectional Sync                                                                       |
| `sync.receiveOnly`            | Receive Only                                                                             |
| `sync.sendOnly`               | Send Only                                                                                |
| `sync.off`                    | Disable                                                                                  |
| `sync.cannotSendHere`         | This window is on another device: it can follow the presenter, but not move the others.  |
| `nav.language`                | Change language                                                                          |
| `language.menu`               | Language                                                                                 |
| `overview.openPage`           | Open the overview page, with the notes                                                   |
| `presenter.goToClick`         | Go to click {no}                                                                         |
| `presenter.goToClickHides`    | Go to click {no}, where this part goes away                                              |
| `presenter.resizeNotes`       | Resize notes panel                                                                       |
| `presenter.resizeNotesHeight` | Resize notes panel height                                                                |
| `presenter.editNotes`         | Edit Notes                                                                               |
| `noteEditor.label`            | Notes of this slide                                                                      |
| `noteEditor.conflict`         | Changed in the file, not saved: copy your text and edit again                            |
| `entry.label`                 | Pages of this deck                                                                       |
| `entry.slides`                | Slides                                                                                   |
| `entry.presenter`             | Presenter                                                                                |
| `entry.notes`                 | Notes                                                                                    |
| `entry.overview`              | Overview                                                                                 |
| `entry.notesEdit`             | Notes editor                                                                             |
| `pages.all`                   | All pages                                                                                |
| `overviewPage.count`          | {count} slides                                                                           |
| `overviewPage.noNotesEdit`    | No notes. Double click to add some.                                                      |
| `overviewPage.notesOf`        | Notes of slide {no}                                                                      |
| `overviewPage.editHint`       | Editable: press Enter or double click to edit.                                           |
| `overviewPage.editing`        | Editing; leave the text to save, Escape to cancel.                                       |
| `overviewPage.saved`          | Saved.                                                                                   |
| `overviewPage.conflict`       | Not saved: the note changed in the file. Reload the page.                                |
| `overviewPage.error`          | Not saved.                                                                               |
| `notesEdit.heading`           | Notes                                                                                    |
| `notesEdit.label`             | The speaker notes of all slides                                                          |
| `notesEdit.invalid`           | Not saved: keep the {count} "--- #N" lines as they are                                   |
| `notesEdit.conflict`          | Not saved: a note changed in the file. Reload the page.                                  |
| `notesEdit.outside`           | Not saved: the notes of a slide imported from outside the project cannot be edited here. |
| `notesEdit.error`             | Not saved                                                                                |
| `notesEdit.offline`           | The notes can only be edited while the dev server runs.                                  |

`entry.overview` and `entry.notesEdit` also start the heading and tab title of `/overview` and `/notes-edit` (`Overview - <title>`).

### The deck browser

| key                          | English                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `nav.browserShow`            | Show deck browser                                                                      |
| `nav.browserHide`            | Hide deck browser                                                                      |
| `browser.label`              | Deck browser                                                                           |
| `browser.newTab`             | New tab                                                                                |
| `browser.closeTab`           | Close tab                                                                              |
| `browser.reload`             | Reload                                                                                 |
| `browser.address`            | Address                                                                                |
| `browser.openWindow`         | Open in window                                                                         |
| `browser.hide`               | Back to the slides                                                                     |
| `browser.refused`            | {site} does not allow being shown inside the deck.                                     |
| `browser.maybeBlank`         | Blank? Some sites refuse to be shown here.                                             |
| `presenter.browserOpen`      | Deck browser: {site}                                                                   |
| `browser.back`               | Back                                                                                   |
| `browser.forward`            | Forward                                                                                |
| `browser.searchHint`         | Search or type an address                                                              |
| `browser.start`              | browser (after the slide.ng name)                                                      |
| `browser.bookmarkAdd`        | Bookmark this page                                                                     |
| `browser.bookmarkRemove`     | Remove bookmark                                                                        |
| `browser.bookmarks`          | Bookmarks                                                                              |
| `browser.home`               | Start page                                                                             |
| `browser.removeTile`         | Remove from the start page                                                             |
| `browser.shortcuts`          | Shortcuts                                                                              |
| `browser.recent`             | Recent                                                                                 |
| `browser.settings`           | Browser settings                                                                       |
| `browser.searchEngine`       | Search engine                                                                          |
| `browser.customSearch`       | Your own: https://…?q=%s                                                               |
| `browser.deckDefault`        | Use the deck default                                                                   |
| `browser.openLinks`          | Open slide links here                                                                  |
| `browser.showBookmarks`      | Show the bookmarks bar                                                                 |
| `browser.clearRecent`        | Clear recent pages                                                                     |
| `browser.clearBookmarks`     | Remove all bookmarks                                                                   |
| `browser.noBookmarks`        | No bookmarks yet: the star in the toolbar adds the page.                               |
| `browser.slides`             | Slides                                                                                 |
| `browser.customEngine`       | Custom                                                                                 |
| `browser.data`               | Data                                                                                   |
| `browser.customise`          | Customise                                                                              |
| `browser.close`              | Close                                                                                  |
| `browser.background`         | Background                                                                             |
| `browser.bgNone`             | None                                                                                   |
| `browser.bgUpload`           | Upload from this device                                                                |
| `browser.bgFull`             | No room to keep another image here. Remove one first.                                  |
| `browser.bgImage`            | Use your own                                                                           |
| `browser.bgSolid`            | Solid colours                                                                          |
| `browser.bgGradient`         | Gradients                                                                              |
| `browser.linksData`          | Links and data                                                                         |
| `browser.showBookmarkTiles`  | Show bookmarks                                                                         |
| `browser.showShortcutTiles`  | Show the deck's shortcuts                                                              |
| `browser.showRecentTiles`    | Show recent pages                                                                      |
| `browser.clock`              | Clock                                                                                  |
| `browser.showClock`          | Show the clock                                                                         |
| `browser.clockFormat`        | Format                                                                                 |
| `browser.clockAuto`          | Automatic ({locale})                                                                   |
| `browser.clock12`            | 12-hour                                                                                |
| `browser.clock24`            | 24-hour                                                                                |
| `browser.showBackground`     | Show a background                                                                      |
| `browser.bgBrand`            | slide.ng                                                                               |
| `browser.bgShuffle`          | Refresh on every new tab                                                               |
| `browser.bgRemove`           | Remove this image                                                                      |
| `browser.appearance`         | Appearance                                                                             |
| `browser.themeAuto`          | Like the deck                                                                          |
| `browser.themeLight`         | Light                                                                                  |
| `browser.themeDark`          | Dark                                                                                   |
| `browser.clockFont`          | Font                                                                                   |
| `browser.clockSize`          | Size                                                                                   |
| `browser.weather`            | Weather                                                                                |
| `browser.showWeather`        | Show the weather                                                                       |
| `browser.weatherPlace`       | Place                                                                                  |
| `browser.weatherCity`        | City name                                                                              |
| `browser.weatherFind`        | Find                                                                                   |
| `browser.weatherUseLocation` | Use my location                                                                        |
| `browser.weatherHere`        | My location                                                                            |
| `browser.weatherNotFound`    | No place found                                                                         |
| `browser.weatherUnit`        | Unit                                                                                   |
| `browser.weatherPrivacy`     | The weather comes from Open-Meteo: the place is sent there while the weather is shown. |
| `browser.weatherLoading`     | Getting the weather…                                                                   |
| `browser.weatherFailed`      | Could not get the weather                                                              |
| `browser.weatherRetry`       | Try again                                                                              |
| `browser.wx.clear`           | Clear                                                                                  |
| `browser.wx.partlyCloudy`    | Partly cloudy                                                                          |
| `browser.wx.cloudy`          | Cloudy                                                                                 |
| `browser.wx.fog`             | Fog                                                                                    |
| `browser.wx.drizzle`         | Drizzle                                                                                |
| `browser.wx.rain`            | Rain                                                                                   |
| `browser.wx.snow`            | Snow                                                                                   |
| `browser.wx.showers`         | Showers                                                                                |
| `browser.wx.thunder`         | Thunderstorm                                                                           |
| `browser.weatherLocating`    | Finding you…                                                                           |
| `browser.weatherDenied`      | Location is blocked for this page. Allow it in the address bar, or type a city.        |
| `browser.weatherNoLocation`  | Your location is not available. Type a city instead.                                   |
| `browser.weatherFeels`       | Feels                                                                                  |
| `browser.weatherFeelsLike`   | Feels like                                                                             |
| `browser.weatherWind`        | Wind                                                                                   |
| `browser.weatherHumidity`    | Humidity                                                                               |
| `browser.showDate`           | Show the date                                                                          |
| `browser.clockDate`          | Clock & date                                                                           |
| `browser.dateStyle`          | Date                                                                                   |
| `browser.showSeconds`        | Show seconds                                                                           |
