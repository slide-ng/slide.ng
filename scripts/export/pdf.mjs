// PDF output: page.pdf of the print page, merged (per-slide mode), titled, with an optional outline.
import { PDFDocument } from '@cantoo/pdf-lib';
import { addOutline, outlineTree } from './outline.mjs';
import { describe } from '../lib/head.mjs';

/** One PDF buffer of the loaded print page, with the paper as big as one slide. */
export function pagePdf(page, { width, height }) {
  return page.pdf({
    width: `${width}px`,
    height: `${height}px`,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    printBackground: true,
    preferCSSPageSize: true,
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

/**
 * Joins the buffers of the batches into one document.
 * `pages` is `{ no, id }` for every PDF page in order; `slides` are the deck's slides (for titles and levels).
 */
export async function buildPdf({ buffers, pages, slides, headmatter, withToc }) {
  const pdf = await PDFDocument.create();
  for (const bytes of buffers) {
    const part = await PDFDocument.load(bytes);
    (await pdf.copyPages(part, part.getPageIndices())).forEach((p) => pdf.addPage(p));
  }
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
      title: s.title,
      level: s.level,
      hide: s.frontmatter?.hideInToc,
      page: firstPage.get(i + 1),
    }))
    .filter((e) => e.title && !e.hide && e.page !== undefined);
}
