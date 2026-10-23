# theme-minimal

The example theme of slide.ng. It shows each part of the theme contract in the smallest form (see docs/WRITING-A-THEME.md):

- `theme.json`: name, default headmatter (`colorSchema: dark`, `transition: fade`, `themeConfig.accent`, which the CSS reads as
  `--slidev-theme-accent`)
- `layouts/cover.ts`, `layouts/quote.ts`: replace two built-in layouts
- `components/callout.ts`: a component slides can use, `<minimal-callout title="Note">...</minimal-callout>`
- `styles/index.css`: the theme's CSS
- `setup/providers.ts`: a setup hook (adds the `b` key)
- `uno.config.mjs`: a UnoCSS shortcut

Use it with `theme: ./path/to/theme-minimal` in the headmatter.
