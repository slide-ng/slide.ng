# theme-blueprint

A drafting-table theme: navy paper with a two-step grid, white lines, amber "pencil" marks, and uppercase IBM Plex Mono headings.

- `layouts/cover.ts`: a title block with corner marks and a sheet label. Frontmatter `sheet` sets the label (default `SHEET 01`).
- `layouts/section.ts`: the title between two dimension lines.
- `components/note.ts`: an annotation with a round label, `<bp-note label="A">text</bp-note>`.
- `styles/index.css`: the palette and the grid.

Use it with `theme: ./path/to/theme-blueprint`.

The theme paints the slide background on `.slidev-layout`, and `layers/global-bottom` is drawn under the slide (as in Slidev), so put a footer in `layers/global-top` instead.

It is dark by default (`colorSchema: dark` in `theme.json`). With `colorSchema: light` or `auto` it has a light "whiteprint" palette: pale paper with blue lines.
