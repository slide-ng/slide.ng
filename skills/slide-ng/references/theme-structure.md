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
| `layers/<name>.ts`    | `global-top`, `global-bottom`, `slide-top`, `slide-bottom` (default export)                 |
| `styles/index.css`    | CSS after the app's styles                                                                  |
| `public/`             | files served from the site root; merged, later root wins on a name                          |
| `setup/*.ts`          | setup hooks, see `setup-overview.md`                                                        |
| `locales/<lang>.json` | translations of the interface (`{ "nav.next": "..." }`), merged key by key; later root wins |
| `uno.config.mjs`      | UnoCSS settings, merged                                                                     |
| `theme.json`          | name, default headmatter, layout inputs                                                     |

- Theme code is copied into the app before compiling, hence the `slide-ng/` alias.
- Symbolic links are never copied. In dev the folders of themes and addons are watched.
- Missing: a `snippets/` convention (write the real snippet path), `setup/routes.ts`, all Vue and Vite files.
