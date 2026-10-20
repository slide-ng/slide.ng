import { Type } from '@angular/core';
import { SlideBase } from './slide-base';

/** What the generator writes for each slide into src/slides/generated/index.ts. */
export interface SlideMeta {
  title: string | null;
  titleHtml?: string | null; // the title with its inline markdown and $math$ as HTML (used by the table of contents and <slide-ng-title-renderer>)
  level: number | null; // heading level of the title (or `level:` frontmatter), used by the table of contents
  layout: string;
  note: string | null;
  noteHtml: string | null; // the note as HTML, with `[click]` markers turned into spans
  routeAlias: string | null; // /alias works like /3
  hideInToc: boolean;
  transition: string | { name: string } | null;
  frontmatter: Record<string, unknown>; // every frontmatter key; unknown keys are kept and ignored
  component: Type<SlideBase>;
}
