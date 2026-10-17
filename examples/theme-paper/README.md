# theme-paper

An editorial theme: warm paper, ink-black serif headlines (Fraunces), Source Sans 3 for text and one vermilion accent.

- `layouts/cover.ts`: a journal masthead. Frontmatter `issue` and `date` fill the line above the title.
- `layouts/section.ts`: a large chapter mark above the title. Frontmatter `no` sets it (default `§`).
- `components/pull-quote.ts`: `<paper-pull by="Name">text</paper-pull>`.
- `styles/index.css`: the palette, and restyled `fact` and `quote` layouts.

Use it with `theme: ./path/to/theme-paper`. The fonts are loaded from Google Fonts (`fonts:` in `theme.json`); set `fonts: { provider: none }` to use local fonts only.

The theme paints the slide background on `.slidev-layout`, and `layers/global-bottom` is drawn under the slide (as in Slidev), so put a footer in `layers/global-top` instead.
