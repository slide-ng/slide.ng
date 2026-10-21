// @vitest-environment node
import { PDFDocument } from '@cantoo/pdf-lib';
import { describe, expect, it } from 'vitest';
import { trimPages } from './pdf.mjs';

describe('trimPages', () => {
  it('cuts the paper Chromium rounded up back to the slide, keeping its top left corner', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([735.12, 414]);
    trimPages(pdf, { width: 980, height: 551.25 });
    const box = pdf.getPage(0).getMediaBox();
    expect([box.x, box.width, box.height]).toEqual([0, 735, 413.4375]);
    expect(box.y + box.height).toBe(414);
  });
  it('leaves a page that is not bigger than the slide alone', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([735, 413]);
    trimPages(pdf, { width: 980, height: 551.25 });
    expect(pdf.getPage(0).getSize()).toEqual({ width: 735, height: 413 });
  });
});
