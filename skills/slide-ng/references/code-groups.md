---
name: code-groups
description: Tabs for several code blocks
---

# Code groups

The tab name is the `[title]` of each block.

````md
::code-group

```sh [npm]
npm i @slide-ng/core
```

```sh [yarn]
yarn add @slide-ng/core
```

::
````

- An icon goes in front of a title (code group tabs, code blocks, Magic Move): `[npm ~i-carbon:terminal~]` (its `@iconify-json` set must be installed), or with `@iconify-json/vscode-icons` installed Slidev's built-in icons are matched from the title (`npm`, `pnpm`, `vue`, `package.json`, `.ts`, ...).
- The `::code-group` ... `::` lines are on their own lines, blank lines around the fences.

<!-- verify -->

````md
---
title: Code groups
---

# Install

::code-group

```sh [npm]
npm install
```

```sh [yarn ~i-carbon:terminal~]
yarn install
```

::
````
