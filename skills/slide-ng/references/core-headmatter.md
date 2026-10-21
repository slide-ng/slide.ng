---
name: headmatter
description: Deck-wide keys in the frontmatter of the first slide
---

# Headmatter

The frontmatter of the **first slide** configures the deck. Other keys are kept and ignored, unless a theme or a component reads them.

| key                                                                                                                | meaning                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`, `titleTemplate` (`'%s \| Conf'`), `info`, `author`, `keywords`, `lang`, `favicon`, `htmlAttrs`, `seoMeta` | the page head, see `build-seo-meta.md`                                                                                                                                                                                                                                                                                                      |
| `lang`, `uiLang`                                                                                                   | `lang: tr` sets `<html lang>`, the interface language (Turkish is built in; other languages: `locales/<lang>.json`, keys in docs/UI-STRINGS.md) and the locale of `date`/`number`/`currency`; `ar`, `he`, `fa`, `ur` mirror the page (keys stay physical); `uiLang` overrides the interface language only, its text keeps its own direction |
| `theme`, `addons`                                                                                                  | look of the deck, see `theme-use.md`                                                                                                                                                                                                                                                                                                        |
| `colorSchema`                                                                                                      | `auto` (default), `light`, `dark` (fixed, no toggle). `all` is not read                                                                                                                                                                                                                                                                     |
| `transition`                                                                                                       | transition of every slide that sets none, see `animation-transitions.md`                                                                                                                                                                                                                                                                    |
| `defaults`                                                                                                         | frontmatter every slide starts from: `defaults: { layout: center }`; a slide's own keys win                                                                                                                                                                                                                                                 |
| `canvasWidth`, `aspectRatio`, `zoom`                                                                               | size, see `layout-canvas-size.md`, `layout-zoom.md`                                                                                                                                                                                                                                                                                         |
| `routerMode`                                                                                                       | `history` (default) or `hash`                                                                                                                                                                                                                                                                                                               |
| `fonts`                                                                                                            | web fonts, see `core-fonts.md`                                                                                                                                                                                                                                                                                                              |
| `themeConfig`                                                                                                      | theme settings; each text or number key is the CSS variable `--slidev-theme-<key>`, see `theme-use.md`                                                                                                                                                                                                                                      |
| `lineNumbers`, `codeCopy`, `shiki`, `codeAliases`, `magicMoveDuration`, `magicMoveCopy`, `plantUmlServer`          | code and diagrams                                                                                                                                                                                                                                                                                                                           |
| `duration`, `timer`                                                                                                | presenter timer, see `presenter-timer.md`                                                                                                                                                                                                                                                                                                   |
| `drawings`, `presenter`, `editor`, `record`, `contextMenu`, `wakeLock`                                             | tools, see `presenter-switches.md`                                                                                                                                                                                                                                                                                                          |
| `download`, `exportFilename`, `export`, `remoteAssets`, `pwa`                                                      | build and export, see `build-*.md`, `export-*.md`                                                                                                                                                                                                                                                                                           |
| `customElements`                                                                                                   | web component tags such as `[model-viewer, sl-*]` (or `true`), see `core-custom-components.md`                                                                                                                                                                                                                                              |
| `dragPos`                                                                                                          | named positions for `slide-ng-drag`; a slide's own frontmatter key (here it covers slide 1 only), see `layout-draggable.md`                                                                                                                                                                                                                 |

<!-- verify -->

```md
---
title: Deck title
titleTemplate: '%s | Conf 2026'
author: Ada
lang: en
colorSchema: auto
transition: fade
lineNumbers: true
defaults:
  layout: center
canvasWidth: 980
aspectRatio: 16/9
duration: 30min
themeConfig:
  primary: '#5d8392'
---

# Configured deck

---

# Every slide starts centered
```
