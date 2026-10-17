// `--format pptx`: a PowerPoint file with one picture per slide (no editable text; that is not supported) and the notes.
import { writeFile } from 'node:fs/promises';
import PptxGenJS from 'pptxgenjs';
import { describe } from '../lib/head.mjs';

export async function writePptx(file, { pictures, slides, headmatter, width, height }) {
  const pptx = new PptxGenJS();
  // PowerPoint sizes are inches; the canvas is in CSS pixels (96 per inch).
  pptx.defineLayout({ name: `${width}x${height}`, width: width / 96, height: height / 96 });
  pptx.layout = `${width}x${height}`;
  if (headmatter.author) pptx.author = String(headmatter.author);
  if (headmatter.title) pptx.title = String(headmatter.title);
  if (headmatter.info) pptx.subject = describe(headmatter.info); // plain text, as in the PDF

  for (const p of pictures) {
    const slide = pptx.addSlide();
    slide.background = { data: `data:image/png;base64,${p.buffer.toString('base64')}` };
    const note = slides[p.no - 1].note;
    if (note) slide.addNotes(note);
  }
  await writeFile(file, await pptx.write({ outputType: 'nodebuffer' }));
}
