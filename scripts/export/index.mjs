// `slide-ng export`: opens the print page of a served deck in Chromium and turns it into a PDF, PNGs, a pptx or markdown.
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname } from 'node:path';
import { parseRangeString } from '@slidev/parser/utils';
import { launchBrowser } from './browser.mjs';
import { screenshotPages, writePictures } from './images.mjs';
import { writeMarkdown } from './markdown.mjs';
import { installRequestFilter } from './request-filter.mjs';
import { dropServerLinks, listPages, loadPrintPage, printQuery, printUrl } from './page.mjs';
import { buildPdf, pagePdf } from './pdf.mjs';
import { writePptx } from './pptx.mjs';

// Pages other than the exporter's own server may not reach private addresses unless `--allow-local` says so (request-filter.mjs).
const filterOptions = (options, served) => ({
  ownOrigin: served.origin,
  allowLocal: options.allowLocal,
});

const EXTENSION = { pdf: '.pdf', pptx: '.pptx', md: '.md', png: '' };

/** The slide numbers `range` picks; an error when it picks none (checked before the deck is built, too). */
export function pagesToExport(deck, range) {
  const total = deck.slides.length;
  // Slidev's parser returns 0 for `0`; only real slides count.
  const pages = parseRangeString(total, range).filter((n) => n >= 1 && n <= total);
  if (!pages.length)
    throw new Error(`export: the range "${range}" matches no slide (the deck has ${total})`);
  return pages;
}

/**
 * `deck` is the parsed deck (slides, headmatter), `served` is `{ origin, base }` of the running copy,
 * `outBase` the output path without extension (see filename.mjs). Returns the path that was written.
 */
export async function exportSlides({
  deck,
  options,
  served,
  routerMode,
  outBase,
  log = console.log,
}) {
  const pages = pagesToExport(deck, options.range);
  const target = outBase + EXTENSION[options.format];
  await mkdir(dirname(outBase), { recursive: true });

  const browser = await launchBrowser(options.executablePath, options);
  try {
    // The page size does not matter for the PDF, but it must hold a slide so that lazy content (iframes) loads.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: options.scale,
    });
    await installRequestFilter(context, filterOptions(options, served), (m) =>
      log(`warning: ${m}`),
    );
    const page = await context.newPage();
    const batches = options.perSlide ? pages.map(String) : [options.range];
    if (options.format === 'pdf' && batches.length > 1)
      log(
        'warning: --per-slide joins one PDF per slide: links between slides and the tags for screen readers are lost (docs/CLI.md)',
      );
    const parts = [];
    for (const [i, range] of batches.entries()) {
      const url = printUrl({
        ...served,
        routerMode,
        query: printQuery({ withClicks: options.withClicks, range }),
      });
      await loadPrintPage(page, { url, ...options, warn: (m) => log(`warning: ${m}`) });
      if (served.temporary) await dropServerLinks(page, served.origin);
      const listed = await listPages(page);
      const size = await page.locator('.print-slide-container').first().boundingBox();
      parts.push(await capture(page, listed, size, options));
      log(
        `rendered ${options.perSlide ? i + 1 : listed.length}/${options.perSlide ? batches.length : listed.length}`,
      );
    }
    await write(target, parts, { deck, options, outBase });
  } finally {
    await browser.close();
  }
  return target;
}

// What one loaded page gives, depending on the format: PDF bytes or pictures.
async function capture(page, listed, size, options) {
  if (options.format === 'pdf') return { listed, size, pdf: await pagePdf(page, size) };
  return { listed, size, pictures: await screenshotPages(page, listed, options) };
}

async function write(target, parts, { deck, options, outBase }) {
  const listed = parts.flatMap((p) => p.listed);
  const { width, height } = parts[0].size;
  const pictures = parts.flatMap((p) => p.pictures ?? []);
  if (options.format === 'pdf') {
    const bytes = await buildPdf({
      buffers: parts.map((p) => p.pdf),
      pages: listed,
      slides: deck.slides,
      headmatter: deck.headmatter,
      withToc: options.withToc,
      size: parts[0].size,
    });
    await writeFile(target, bytes);
  } else if (options.format === 'png') {
    await writePictures(target, pictures);
  } else if (options.format === 'pptx') {
    await writePptx(target, {
      pictures,
      slides: deck.slides,
      headmatter: deck.headmatter,
      width,
      height,
    });
  } else {
    const folder = `${basename(outBase)}-images`;
    await writePictures(`${outBase}-images`, pictures);
    await writeMarkdown(target, { slides: deck.slides, pictures, folder });
  }
}

/** `slide-ng export-notes`: the speaker notes of every slide as an A4 PDF. */
export async function exportNotes({ options, served, routerMode, outBase, log = console.log }) {
  const target = outBase + '.pdf';
  await mkdir(dirname(outBase), { recursive: true });
  const browser = await launchBrowser(options.executablePath, options);
  try {
    const context = await browser.newContext();
    await installRequestFilter(context, filterOptions(options, served), (m) =>
      log(`warning: ${m}`),
    );
    const page = await context.newPage();
    await page.emulateMedia({ media: 'screen' });
    const query = options.range ? new URLSearchParams({ range: options.range }).toString() : '';
    await page.goto(printUrl({ ...served, routerMode, query, path: 'presenter/print' }), {
      waitUntil: options.waitUntil,
      timeout: options.timeout,
    });
    await page.locator('[data-slide-ng-print="ready"]').waitFor({ timeout: options.timeout });
    if (served.temporary) await dropServerLinks(page, served.origin);
    if (options.wait) await page.waitForTimeout(options.wait);
    await writeFile(
      target,
      await page.pdf({
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        printBackground: true,
        preferCSSPageSize: true,
        tagged: true, // headings, lists and text are marked for screen readers
      }),
    );
    log('notes written');
  } finally {
    await browser.close();
  }
  return target;
}
