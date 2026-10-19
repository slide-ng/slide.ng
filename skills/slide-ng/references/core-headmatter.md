---
name: headmatter
description: Deck-wide keys in the frontmatter of the first slide
---

# Headmatter

The frontmatter of the **first slide** configures the deck. Other keys are kept and ignored, unless a theme or a component reads them.

| key                                                                                                                | meaning                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `title`, `titleTemplate` (`'%s \| Conf'`), `info`, `author`, `keywords`, `lang`, `favicon`, `htmlAttrs`, `seoMeta` | the page head, see `build-seo-meta.md`                                                                                      |
| `theme`, `addons`                                                                                                  | look of the deck, see `theme-use.md`                                                                                        |
| `colorSchema`                                                                                                      | `auto` (default), `light`, `dark` (fixed, no toggle). `all` is not read                                                     |
| `transition`                                                                                                       | transition of every slide that sets none, see `animation-transitions.md`                                                    |
| `defaults`                                                                                                         | frontmatter every slide starts from: `defaults: { layout: center }`; a slide's own keys win                                 |
| `canvasWidth`, `aspectRatio`, `zoom`                                                                               | size, see `layout-canvas-size.md`, `layout-zoom.md`                                                                         |
| `routerMode`                                                                                                       | `history` (default) or `hash`                                                                                               |
| `fonts`                                                                                                            | web fonts, see `core-fonts.md`                                                                                              |
| `lineNumbers`, `codeCopy`, `shiki`, `codeAliases`, `magicMoveDuration`, `magicMoveCopy`, `plantUmlServer`          | code and diagrams                                                                                                           |
| `duration`, `timer`                                                                                                | presenter timer, see `presenter-timer.md`                                                                                   |
| `drawings`, `presenter`, `editor`, `record`, `contextMenu`, `wakeLock`                                             | tools, see `presenter-switches.md`                                                                                          |
| `download`, `exportFilename`, `export`, `remoteAssets`, `pwa`                                                      | build and export, see `build-*.md`, `export-*.md`                                                                           |
| `mcp`                                                                                                              | `false` turns off the dev server's MCP endpoint `/__mcp`, see `mcp-server.md`                                               |
| `customElements`                                                                                                   | web component tags such as `[model-viewer, sl-*]` (or `true`), see `core-custom-components.md`                              |
| `dragPos`                                                                                                          | named positions for `slide-ng-drag`; a slide's own frontmatter key (here it covers slide 1 only), see `layout-draggable.md` |

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
---

# Configured deck

---

# Every slide starts centered
```
