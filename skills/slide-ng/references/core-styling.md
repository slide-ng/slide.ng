---
name: styling
description: UnoCSS utility classes, scoped slide styles, dark mode and direction variants
---

# Styling

- **UnoCSS** (Tailwind-like names, preset wind3 plus icons) in HTML and in `class:` frontmatter. CSS is generated for the classes in use. A deck, theme or addon can add rules in `uno.config.mjs`.
- As in Slidev: **variant groups** `class="hover:(bg-blue-500 text-white)"` (expanded in slide markup, not in code blocks or inline code; in a component write the classes out), **attributify** `<div flex="~ col" text="sm red-500" hover:bg="blue-500">` and valueless `<div flex items-center>` (read in the deck's files, themes and addons), **typography** `class="prose"` (`dark:prose-invert`, `not-prose`).
- **Per-slide `<style>`**: applies to that slide only; the CSS is nested under the slide's own element, so layout elements can be targeted too. Nested rules and `&` work. `@apply p-4;`, `--uno: p-4;`, `@screen md { }` and `theme('colors.red.500')` are written out as CSS, also in `styles/`; an unknown utility gives a `[slides]` warning. `h1 { @apply dark:text-white; }` works in a slide's `<style>` (also `forward:`, `backward:`); `group-hover:`/`peer-checked:` look for the `.group`/`.peer` inside the slide.
- **Global CSS**: `styles/index.css` in the deck, a theme or an addon (comes after the app's CSS).
- **Dark mode**: UnoCSS `dark:` classes (`dark:text-white`), `<slide-ng-light-or-dark>`.
- **Direction**: after a move the stage has `slidev-nav-go-forward` / `slidev-nav-go-backward`, so `forward:text-red` and `backward:text-red` classes work.
- Pictures from `public/` are written `/photo.png`.

<!-- verify -->

```md
---
title: Styling
---

# Styled title

<div class="p-4 rounded bg-blue-500 text-white dark:bg-blue-900">A box with utility classes</div>

<div flex="~ col" gap="2" class="hover:(text-red-500 font-bold)">Attributify and a variant group</div>

<div class="prose"><p>Long text with <a href="https://unocss.dev">a link</a>.</p></div>

<style>
h1 {
  color: red;
}
.prose {
  @apply mt-4;
}
</style>

---

# Next slide keeps the default title colour

<div class="forward:text-red backward:text-blue">changes with the direction</div>
```
