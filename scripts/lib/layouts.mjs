// The layouts a slide can name with `layout:`. Names are the same as in Slidev.
//   file       the layout component under src/app/
//   props      frontmatter keys that become inputs of the layout
//   classProp  true: the frontmatter `class` goes to the content (input `contentClass`),
//              false: it goes on the layout element itself
//   slots      names accepted after `::name::` (the default slot always exists)
import { didYouMean } from './did-you-mean.mjs';

const entry = (name, className, extra = {}) => ({
  className,
  tag: `sn-${name}`,
  file: `layouts/${name}`,
  props: [],
  classProp: false,
  slots: [],
  ...extra,
});
const image = { props: ['image', 'backgroundSize'] };
const frame = { props: ['url', 'scale'] };

export const LAYOUTS = {
  default: entry('default', 'DefaultLayout'),
  cover: entry('cover', 'CoverLayout', { props: ['background'] }),
  center: entry('center', 'CenterLayout'),
  end: entry('end', 'EndLayout'),
  fact: entry('fact', 'FactLayout'),
  full: entry('full', 'FullLayout'),
  image: entry('image', 'ImageLayout', image),
  'image-left': entry('image-left', 'ImageLeftLayout', { ...image, classProp: true }),
  'image-right': entry('image-right', 'ImageRightLayout', { ...image, classProp: true }),
  iframe: entry('iframe', 'IframeLayout', frame),
  'iframe-left': entry('iframe-left', 'IframeLeftLayout', { ...frame, classProp: true }),
  'iframe-right': entry('iframe-right', 'IframeRightLayout', { ...frame, classProp: true }),
  intro: entry('intro', 'IntroLayout'),
  none: entry('none', 'NoneLayout'),
  quote: entry('quote', 'QuoteLayout'),
  section: entry('section', 'SectionLayout'),
  statement: entry('statement', 'StatementLayout'),
  'two-cols': entry('two-cols', 'TwoColsLayout', {
    props: ['layoutClass'],
    classProp: true,
    slots: ['left', 'right'],
  }),
  'two-cols-header': entry('two-cols-header', 'TwoColsHeaderLayout', {
    props: ['layoutClass'],
    classProp: true,
    slots: ['left', 'right', 'bottom'],
  }),
  404: entry('404', 'NotFoundLayout'),
  error: entry('error', 'ErrorLayout'),
};

// Slidev's rule: the first slide is a cover, the others use `default`.
// A name we do not know falls back to `default`, with a warning that lists the real names.
// `layouts` is the table to look in: the built-in one, or that table plus the layouts of themes (scan-roots.mjs).
export function layoutName(frontmatter, index, layouts = LAYOUTS) {
  const wanted = frontmatter.layout ?? (index === 0 ? 'cover' : 'default');
  if (layouts[wanted]) return wanted;
  console.warn(
    `[slides] slide ${index + 1}: unknown layout "${wanted}", using "default".${didYouMean(String(wanted), Object.keys(layouts))} Available: ${Object.keys(layouts).join(', ')}`,
  );
  return 'default';
}
