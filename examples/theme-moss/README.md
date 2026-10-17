# theme-moss

A dark, earthy theme: forest green, moss and clay on sand-coloured text, set in Manrope and IBM Plex Mono.

- `layouts/cover.ts`: the title low on the left over a soft green and clay light.
- `layouts/section.ts`: a moss-to-clay bar beside the title.
- `components/stat.ts`: `<moss-stat value="42%" label="of the forest"></moss-stat>`.
- `styles/index.css`: the palette, and restyled `fact` and `statement` layouts.

Use it with `theme: ./path/to/theme-moss`.

The theme paints the slide background on `.slidev-layout`, and `layers/global-bottom` is drawn under the slide (as in Slidev), so put a footer in `layers/global-top` instead.
