// The id of the first print page of slide `no`. A link to a slide points at it in the print page, which Chromium turns
// into a link inside the PDF.
export const printAnchor = (no: number) => `slide-ng-page-${no}`;
