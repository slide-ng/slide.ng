// PDF output: page.pdf of the print page, merged (per-slide mode), titled, with an optional outline.
import { PDFDocument, PDFName } from '@cantoo/pdf-lib';
import { addOutline, outlineTree } from './outline.mjs';
import { describe } from '../lib/head.mjs';
import { plainTitle } from '../lib/index-source.mjs';

/** One PDF buffer of the loaded print page, with the paper as big as one slide. */
export function pagePdf(page, { width, height }) {
  return page.pdf({
    width: `${width}px`,
    height: `${height}px`,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true, // headings, lists and text are marked for screen readers
  });
}

// Document properties from the headmatter (the same fields Slidev uses).
function setProperties(pdf, headmatter) {
  pdf.setProducer('slide.ng');
  pdf.setCreator('slide.ng');
  if (headmatter.title) pdf.setTitle(String(headmatter.title));
  if (headmatter.info) pdf.setSubject(describe(headmatter.info));
  if (headmatter.author) pdf.setAuthor(String(headmatter.author));
  const keywords = headmatter.keywords;
  if (keywords)
    pdf.setKeywords(
      Array.isArray(keywords)
        ? keywords.map(String)
        : String(keywords)
            .split(',')
            .map((k) => k.trim()),
    );
}

// Chromium rounds the paper up (980 css pixels are 735.12 pt, not 735) and paints only the slide's own box, which left a
// thin white line at the edge of a dark page. Each page is cut back to the slide, at its top left corner.
export function trimPages(pdf, { width, height }) {
  const [w, h] = [width * 0.75, height * 0.75]; // css pixels to points
  for (const page of pdf.getPages()) {
    const box = page.getMediaBox();
    if (box.width <= w && box.height <= h) continue;
    const [nw, nh] = [Math.min(box.width, w), Math.min(box.height, h)];
    page.setMediaBox(box.x, box.y + box.height - nh, nw, nh);
    if (page.node.CropBox()) page.setCropBox(box.x, box.y + box.height - nh, nw, nh);
  }
}

/**
 * Joins the buffers of the batches into one document.
 * `pages` is `{ no, id }` for every PDF page in order; `slides` are the deck's slides (for titles and levels);
 * `size` is the slide's size in css pixels.
 */
export async function buildPdf({ buffers, pages, slides, headmatter, withToc, size }) {
  // One batch (the usual case) is kept as Chromium wrote it, with its tags for screen readers: copying pages into a new
  // document drops them. Several batches (`--per-slide`) are joined, and that copy is untagged and has no links between
  // slides (Chromium leaves out a link to a slide that is not in the same batch); it keeps the language of the page.
  let pdf;
  if (buffers.length === 1) pdf = await PDFDocument.load(buffers[0]);
  else {
    pdf = await PDFDocument.create();
    for (const [i, bytes] of buffers.entries()) {
      const part = await PDFDocument.load(bytes);
      const lang = part.catalog.lookup(PDFName.of('Lang')); // a string, never a reference into `part`
      if (i === 0 && lang) pdf.catalog.set(PDFName.of('Lang'), lang);
      (await pdf.copyPages(part, part.getPageIndices())).forEach((p) => pdf.addPage(p));
    }
  }
  if (size) trimPages(pdf, size);
  setProperties(pdf, headmatter);
  if (withToc) addOutline(pdf, outlineTree(tocEntries(slides, pages)));
  return pdf.save();
}

// A bookmark for every slide that has a title, pointing to the slide's first page. Slides left out of the range have no page.
export function tocEntries(slides, pages) {
  const firstPage = new Map();
  pages.forEach((p, i) => {
    if (!firstPage.has(p.no)) firstPage.set(p.no, i);
  });
  return slides
    .map((s, i) => ({
      title: s.title == null ? s.title : plainTitle(s.title),
      level: s.level,
      hide: s.frontmatter?.hideInToc,
      page: firstPage.get(i + 1),
    }))
    .filter((e) => e.title && !e.hide && e.page !== undefined);
}
