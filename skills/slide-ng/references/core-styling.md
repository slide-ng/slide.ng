---
name: styling
description: UnoCSS utility classes, scoped slide styles, dark mode and direction variants
---

# Styling

- **UnoCSS** (Tailwind-like names, preset wind3 plus icons) in HTML and in `class:` frontmatter. CSS is generated for the classes in use. A deck, theme or addon can add rules in `uno.config.mjs`.
- **Per-slide `<style>`**: applies to that slide only; the CSS is nested under the slide's own element, so layout elements can be targeted too. Nested rules and `&` work. `--uno:` directives do not; use utility classes in the HTML.
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

<style>
h1 {
  color: red;
}
</style>

---

# Next slide keeps the default title colour

<div class="forward:text-red backward:text-blue">changes with the direction</div>
```
