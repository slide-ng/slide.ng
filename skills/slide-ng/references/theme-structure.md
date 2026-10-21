---
name: theme-structure
description: Roots, folders a root may hold, and who wins
---

# Roots and folders

Each of these is a **root**; later roots win over earlier ones, file by file and name by name:

1. the built-in theme (`src/app`, always there)
2. `theme:`
3. each of `addons:`, in order
4. the deck's own folder (where the entry markdown is)

The deck's folder is only searched for the folders below, never copied whole.

| folder or file        | what it does                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `layouts/<name>.ts`   | a layout; the name is what `layout:` writes                                                 |
| `components/*.ts`     | components usable as tags, found by `selector`                                              |
| `layers/<name>.ts`    | a `global-*`, `slide-*` or `custom-nav-controls` layer (its default export)                 |
| `styles/index.css`    | CSS after the app's styles                                                                  |
| `public/`             | files served from the site root; merged, later root wins on a name                          |
| `setup/*.ts`          | setup hooks, see `setup-overview.md`                                                        |
| `index.html`          | its `<head>` part goes into the page head, its `<body>` part after the app                  |
| `locales/<lang>.json` | translations of the interface (`{ "nav.next": "..." }`), merged key by key; later root wins |
| `uno.config.mjs`      | UnoCSS settings, merged                                                                     |
| `theme.json`          | name, default headmatter, layout inputs                                                     |

- Theme code is copied into the app before compiling, hence the `slide-ng/` alias.
- `index.html` is for tags the headmatter has no key for (analytics, a `<meta>`, a font link). Parts of every root are joined in root order and copied as they are, except: its `<title>` and `<meta name|property>` replace the headmatter's of the same name and `media` (later root wins; Open Graph arrays such as `og:image`, `article:tag` repeat and are all kept), `<html>`/`<body>` attributes are added (headmatter `lang`/`htmlAttrs` win, `class` joined), and root addresses (`src="/x.js"`, `href="/brand.css"`) get the base like `/x.svg` in a slide; its scripts run in dev, builds, offline folders and exports. No `<script type="module" src>` in an offline folder.
- Symbolic links are never copied. In dev the folders of themes and addons are watched.
- Missing: a `snippets/` convention (write the real snippet path), all Vue and Vite files.
