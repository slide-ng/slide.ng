// Two small markdown-it-attrs habits that Slidev decks use:
//   ## Title {#intro .big}     an id and classes on a heading
//   ![logo](/logo.png){width=120}   a width or height on a picture
// Run on the HTML from marked, before braces are made harmless for Angular.

// The text may not run past its own closing tag, so `{...}` on a later heading stays with that heading.
const HEADING = /<(h[1-6])>((?:(?!<\/\1>)[\s\S])*?)\s*\{((?:\s*[#.][\w-]+)+)\s*\}<\/\1>/g;
const IMAGE_SIZE = /(<img\b[^>]*?)(\s*\/?)>\{((?:\s*(?:width|height)=\d+(?:px|%)?)+)\s*\}/g;

export function applyAttrSugar(html) {
  return html
    .replace(HEADING, (_, tag, text, spec) => {
      const id = /#([\w-]+)/.exec(spec)?.[1];
      const classes = [...spec.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      return `<${tag}${id ? ` id="${id}"` : ''}${classes.length ? ` class="${classes.join(' ')}"` : ''}>${text}</${tag}>`;
    })
    .replace(IMAGE_SIZE, (_, img, slash, spec) => {
      const size = [...spec.matchAll(/(width|height)=(\S+)/g)].map(([, k, v]) => ` ${k}="${v}"`);
      return `${img}${size.join('')}${slash}>`;
    });
}
